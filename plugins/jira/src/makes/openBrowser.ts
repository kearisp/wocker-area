import {spawn} from "child_process";


const commandFor = (url: string): [string, string[]] => {
    if(process.env.WSL_DISTRO_NAME) {
        return ["explorer.exe", [url]];
    }

    if(process.platform === "darwin") {
        return ["open", [url]];
    }

    if(process.platform === "win32") {
        return ["rundll32", ["url.dll,FileProtocolHandler", url]];
    }

    return ["xdg-open", [url]];
};

// Best effort: callers print the URL as well, so a missing opener is not an error.
export const openBrowser = (url: string): void => {
    try {
        const [command, args] = commandFor(url),
              child = spawn(command, args, {detached: true, stdio: "ignore"});

        child.on("error", () => {});
        child.unref();
    }
    catch(err) {}
};
