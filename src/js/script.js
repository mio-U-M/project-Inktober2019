import GalleryController from "./garalley.js";

// load start

// garalley setting
const view = document.querySelector(".js-gareley");
const garalleyView = new GalleryController(view);

garalleyView.on("stageStandBy", () => {
    // loadingを開ける処理
});
garalleyView.init();

// menu set
