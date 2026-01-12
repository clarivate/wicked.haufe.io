#!/bin/bash

start_test(){
npm test
node validate.js `pwd`
}

if [ -d "wicked-config" ];then
    start_test
else 
    git clone https://git.clarivate.io/scm/edo/wicked-config.git
    start_test
fi

