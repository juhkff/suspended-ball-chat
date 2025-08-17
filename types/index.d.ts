import {ChatPanel} from "./components/chat-panel";
import {SuspendedBallChat} from "./components/suspended-ball-chat";
import {ChatMessage} from "./common";


// 安装全部的插件
declare function install(Vue: typeof import("vue").default): void;

export {
    install,
    ChatMessage,
    ChatPanel,
    SuspendedBallChat,
};
