'use strict';

const { debug, info, warn, error } = require('portal-env').Logger('portal-api:dao:pg:users');

const utils = require('../../../routes/utils');
const daoUtils = require('../../dao-utils');

class PgUsers {
    constructor(pgUtils) {
        this.pgUtils = pgUtils;
    }

    // =================================================
    // DAO contract
    // =================================================

    getById(userId, callback) {
        debug('getById()');
        this.pgUtils.checkCallback(callback);
        return this.getByIdImpl(userId, callback);
    }

    getByEmail(email, callback) {
        debug('getByEmail()');
        this.pgUtils.checkCallback(callback);
        return this.getByEmailImpl(email, callback);
    }

    save(userInfo, savingUserId, callback) {
        debug('save()');
        this.pgUtils.checkCallback(callback);
        return this.createOrSaveImpl(userInfo, callback);
    }

    create(userCreateInfo, callback) {
        debug('create()');
        this.pgUtils.checkCallback(callback);
        return this.createOrSaveImpl(userCreateInfo, callback);
    }

    // Patch is not needed anymore, thus has no implementation

    delete(userId, deletingUserId, callback) {
        debug('delete()');
        this.pgUtils.checkCallback(callback);
        return this.deleteImpl(userId, deletingUserId, callback);
    }

    getIndex(offset, limit, callback) {
        debug('getIndex()');
        this.pgUtils.checkCallback(callback);
        return this.getIndexImpl(offset, limit, callback);
    }

    getCount(callback) {
        debug('getCount()');
        this.pgUtils.checkCallback(callback);
        return this.pgUtils.count('users', callback);
    }

    getShortInfoByEmail(email, callback) {
        debug('getShortInfoByEmail');
        this.pgUtils.checkCallback(callback);
        return this.getShortInfoByField('email', email, callback);
    }

    getShortInfoByCustomId(customId, callback) {
        debug('getShortInfoByEmail');
        this.pgUtils.checkCallback(callback);
        return this.getShortInfoByField('custom_id', customId, callback);
    }

    // =================================================
    // DAO implementation/internal methods
    // =================================================

    getByIdImpl(userId, callback) {
        debug('getByIdImpl()');
        const instance = this;
        return this.pgUtils.getById('users', userId, (err, userInfo) => {
            if (err) {
                return callback(err);
            }
            if (!userInfo) {
                return callback(null, null);
            }
            instance.pgUtils.getBy('owners', 'userId', userId, {}, (err, ownerList) => {
                if (err) { return callback(err); }
                userInfo.applications = ownerList.map(o => { return { id: o.appId }; });
                return callback(null, userInfo);
            });
        });
    }

    getByEmailImpl(email, callback) {
        debug('getByEmail()');
        const instance = this;
        this.getShortInfoByField('email', email, (err, shortUserInfo) => {
            if (err) {
                return callback(err);
            }
            if (!shortUserInfo) {
                return callback(null, null);
            } // Not found
            // Delegate to getByIdImpl
            return instance.getByIdImpl(shortUserInfo.id, callback);
        });
    }

    createOrSaveImpl(userInfo, callback) {
        debug('createOrSaveImpl()');

        const tmpUser = Object.assign({}, userInfo);
        // We don't persist this in the user object, but take it from the relation
        // to the application via the "owners" table.
        if (tmpUser.applications) {
            delete tmpUser.applications;
        }
        // Need to add developer group if validated?
        daoUtils.checkValidatedUserGroup(userInfo);

        this.pgUtils.upsert('users', userInfo, null, (err, userInfo) => {
            if (err) {
                // Check for duplicate code and map to specific error
                if (err.code === '23505') {
                    err.status = 409; // Conflict
                }
                return callback(err);
            }
            return callback(null, userInfo);
        });
    }

    deleteImpl(userId, deletingUserId, callback) {
        debug('deleteImpl()');
        const instance = this;
        this.getById(userId, (err, userInfo) => {
            if (err) {
                return callback(err);
            }
            if (!userInfo) {
                return callback(utils.makeError(404, 'Not found'));
            }
            return instance.pgUtils.deleteById('users', userId, callback);
        });
    }

    getIndexImpl(offset, limit, callback) {
        debug(`getIndexImpl(offset: ${offset}, limit: ${limit})`);
        this.pgUtils.getBy('users', [], [], { offset: offset, limit: limit }, (err, userList, countResult) => {
            if (err) {
                return callback(err);
            }
            // This might be more efficient with a dedicated SELECT, but...
            const userIndex = userList.map(userInfo => PgUsers.makeShortInfo(userInfo));
            return callback(null, userIndex, countResult);
        });
    }

    getShortInfoByField(fieldName, fieldValue, callback) {
        debug(`getShortInfoByField(${fieldName}, ${fieldValue})`);
        this.pgUtils.getSingleBy('users', fieldName, fieldValue, (err, userInfo) => {
            if (err) {
                return callback(err);
            }
            // Not found
            if (!userInfo) {
                return callback(null, null);
            }

            return callback(null, PgUsers.makeShortInfo(userInfo));
        });
    }

    static makeShortInfo(userInfo) {
        return {
            id: userInfo.id,
            email: userInfo.email,
            customId: userInfo.customId
        };
    }

    // Cascade email to owners+registrations; customId only to registrations
    cascadeUserFields(userId, newEmail, newCustomId, callback) {
        debug(`cascadeUserFields(${userId}, email: ${newEmail}, customId: ${newCustomId})`);
        this.pgUtils.getPoolOrClient((err, pool) => {
            if (err) {
                return callback(err);
            }
            const params = [];
            const statements = [];
            let paramIdx = 1;

            const emailParamIdx = newEmail ? paramIdx++ : null;
            if (newEmail) params.push(JSON.stringify(newEmail));

            const customIdParamIdx = newCustomId ? paramIdx++ : null;
            if (newCustomId) params.push(JSON.stringify(newCustomId));

            const userIdParamIdx = paramIdx;
            params.push(userId);

            if (newEmail) {
                statements.push(`UPDATE wicked.owners SET data = jsonb_set(data, '{email}', $${emailParamIdx}::jsonb) WHERE users_id = $${userIdParamIdx}`);
            }

            const regClauses = [];
            if (newEmail) regClauses.push(`data = jsonb_set(data, '{email}', $${emailParamIdx}::jsonb)`);
            if (newCustomId) regClauses.push(`data = jsonb_set(data, '{customId}', $${customIdParamIdx}::jsonb)`);
            if (regClauses.length > 0) {
                statements.push(`UPDATE wicked.registrations SET ${regClauses.join(', ')} WHERE users_id = $${userIdParamIdx}`);
            }

            const sql = statements.join(';\n');
            pool.query(sql, params, (err) => {
                if (err) {
                    error(`cascadeUserFields: Failed for user ${userId}: ${err.message}`);
                    return callback(err);
                }
                info(`cascadeUserFields: Cascaded updates to owners and registrations for user ${userId}`);
                return callback(null);
            });
        });
    }
}

module.exports = PgUsers;
