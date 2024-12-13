#!/usr/bin/env node

const {promptSelect} = require("@wocker/utils");


promptSelect({
    message: "Select value",
    multiple: true,
    required: true,
    default: "test-2",
    options: [
        {label: "Test 1", value: "test-1"},
        {label: "Test 2", value: "test-2"},
        {label: "Test 3", value: "test-3"},
    ],
    // validate: () => {
    //     return new Promise((resolve) => setTimeout(resolve, 1000));
    // }
}).then((res) => {
    console.log("Selected:", res);
});
