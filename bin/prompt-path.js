#!/usr/bin/env node

const {promptPath} = require("@wocker/utils");

promptPath({
    message: "Path",
    required: true
});
