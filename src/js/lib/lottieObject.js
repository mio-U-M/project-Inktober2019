import lottie from "lottie-web";
import EventEmitter2 from "eventemitter2";
import { BASE_DIR } from "../../constants.yml";
import { LOTTIE_LIST } from "../constant";

export default class LottieObject extends EventEmitter2 {
    constructor(dom, animeType, loop = true) {
        super();

        this.animation = null;

        this.dom = dom;
        this.data = LOTTIE_LIST[animeType];
        this.loop = loop;
    }

    init() {
        this.animation = lottie.loadAnimation({
            container: this.dom,
            renderer: "svg",
            loop: this.loop,
            autoplay: false,
            path: `${BASE_DIR}lottie/${this.data}`
        });

        this.animation.addEventListener("DOMLoaded", () => {
            this.emit("finish");
        });
    }

    play() {
        this.animation.play();
    }

    stop() {
        this.animation.stop();
    }

    destroy() {
        this.animation.destroy();
    }
}
