#!/usr/bin/env node


const {Cli, Logger} = require("@kearisp/cli"),
      Docker = require("dockerode");
const {FileSystem} = require("@wocker/core");
const {
    Fixtures,
    ModemRecorder
} = require("@wocker/testing");


Logger.unmute();

const getContext = (version, path) => {
    const fs = (new FileSystem(__dirname))
        .cd("/../packages")
        .cd(path)
        .cd("fixtures");

    if(!fs.exists()) {
        throw new Error(`Path "${fs.path()}" doesn't exists`);
    }

    const fixtures = Fixtures.fromFS(fs);
    const docker = new Docker({
        modem: new ModemRecorder({
            recordFixtures: fixtures,
            version: version === "v1" ? undefined : version,
            socketPath: "/var/run/docker.sock"
        })
    });

    return {
        docker,
        fixtures,
        fs
    };
};

const followStream = async (stream, log) => {
    await new Promise((resolve, reject) => {
        stream.on("data", (chunk) => {
            if(!log) {
                return;
            }

            process.stdout.write(chunk.toString());
        });

        stream.on("end", resolve);
        stream.on("error", reject);
    });
};

const cli = new Cli();

cli.command("pull <image>")
    .option("version", {
        type: "string",
        alias: "v",
        default: "v1"
    })
    .option("log", {
        type: "boolean",
        alias: "l"
    })
    .option("workspace", {
        type: "string",
        alias: "w"
    })
    .action(async (input) => {
        const {docker} = getContext(
            input.option("version"),
            input.option("workspace")
        );

        const name = input.argument("image"),
              image = docker.getImage(name);

        await image.remove().catch(() => undefined);

        const stream = await docker.pull(name);

        await followStream(stream, input.option("log"));

        await image.inspect();
    });

cli.command("build <name>:<tag>")
    .option("log", {
        alias: "l",
        type: "boolean"
    })
    .option("version", {
        alias: "v",
        type: "string",
        default: "v1"
    })
    .option("buildVersion", {
        alias: "V",
        type: "string",
        default: "1"
    })
    .option("workspace", {
        type: "string",
        alias: "w"
    })
    .action(async (input) => {
        const {docker, fs} = getContext(
            input.option("version"),
            input.option("workspace")
        );
        const name = input.argument("name"),
              tag = input.argument("tag");

        const stream = await docker.buildImage({
            context: fs.path(`projects/${name}`),
            src: fs.readdir(`projects/${name}`, {
                recursive: true
            })
        }, {
            t: `${name}:${tag}`,
            dockerfile: "./Dockerfile",
            version: input.option("buildVersion")
        });

        await followStream(stream, input.option("log"));

        const image = docker.getImage(`${name}:${tag}`);

        await image.inspect();
    });

cli.run(process.argv);
