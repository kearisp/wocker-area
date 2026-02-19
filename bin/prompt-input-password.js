#!/usr/bin/env node

const {promptInput} = require("@wocker/utils");


promptInput({
    message: "Password",
    type: "password",
    required: true,
    // suffix: "qwdq"
});
