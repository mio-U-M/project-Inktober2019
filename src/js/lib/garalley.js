import * as PIXI from "pixi.js";
import EventEmitter2 from "eventemitter2";

const IMAGE_PADDING = 7;
const IMAGE_LIST_SCALE = 0.7;
const CONTAINER_TURNING_POINT = 3;
const CONTAINER_COUNT = 9;

export default class Gallery extends EventEmitter2 {
    constructor(canvas) {
        super();

        this.canvas = canvas;
        this.application = null;

        // 事前にもらうデータ
        this.totalImageCount = 0;

        // assets周り
        this.loader = PIXI.loader;

        this.loadedSolidImageData = [];

        // 読み込み前の画像
        this.imageDatas = [];
        // 読み込み完了＆未表示の画像
        this.loadedImagesData = [];
        // 表示入れ込み済みの画像
        this.displayedImageData = [];

        this.wrapperContainer = null;

        // 移動範囲の最大と最小(canvasの座標に合わせて設定)
        this.endXPosition = {};
        this.endYPosition = {};

        // 橋にまで来た時に戻る量（リピートに見せるため）
        this.backPosition = {};

        // 画像のクリックか単純なドラッグかの制御
        this.isClickImageSplite = false;

        this.currentDragPosition = {};
        this.newDragPosition = {};
    }

    async init() {
        if (this.imageDatas.length < 1 || this.totalImageCount < 1) return;

        this.application = new PIXI.Application({
            width: window.innerWidth,
            height: window.innerHeight,
            view: this.canvas,
            resolution: window.devicePixelRatio || 1,
            autoResize: true,
            backgroundColor: "0x0082ca"
        });

        // アセット読み込み
        await this.loadAssets();
        this.renderAssets();

        // this.application.ticker.maxFPS = 16
        // this.application.ticker.add(() => {
        // })

        // 座標設定
        this.setEndpoint();

        window.addEventListener("resize", () => {
            this.resizeView();
        });
    }

    loadAssets() {
        // きた枚数の分だけloaderに追加していくイメージで
        return new Promise(resolve => {
            this.loader.reset();

            this.imageDatas.forEach((element, i) => {
                this.loader.add(
                    `solid-${i}`,
                    resolvePath.image(`museum/${element}`)
                );
            });

            this.loader.load((loader, resources) => {
                this.setLoadedImageData(Object.values(resources));
                this.clearImageData();
                resolve();
            });
        });
    }

    renderAssets() {
        // 大元のコンテナ
        this.wrapperContainer = new PIXI.Container();
        let containerX = 0;
        let containerY = 0;
        // 折り返しポイントの計算（平方根で出た値を切り上げした値が一番近しい正方形の値とする
        const turningPoint = Math.floor(Math.sqrt(this.totalImageCount));
        // 画像を詰めるコンテナの位置配置
        let singleX = 0;
        let singleY = 0;

        for (let index = 1; index < CONTAINER_COUNT + 1; index++) {
            // 初期化
            singleX = 0;
            singleY = 0;
            // 画像を詰めるコンテナを詰める作業
            const container = new PIXI.Container();
            this.loadedImagesData.forEach((element, i) => {
                const imageSprite = new PIXI.Sprite(element.texture);
                // 位置計算
                if (i > 0) {
                    i % turningPoint !== 0
                        ? (singleX +=
                              imageSprite.width * IMAGE_LIST_SCALE +
                              IMAGE_PADDING)
                        : (singleX = 0);
                    if (i % turningPoint === 0)
                        singleY +=
                            imageSprite.height * IMAGE_LIST_SCALE +
                            IMAGE_PADDING;
                }
                imageSprite.position.x = singleX;
                imageSprite.position.y = singleY;
                imageSprite.scale.x = IMAGE_LIST_SCALE;
                imageSprite.scale.y = IMAGE_LIST_SCALE;

                // 画像にクリックイベント
                imageSprite.interactive = true;
                imageSprite.on("mousedown", () => {
                    this.isClickImageSplite = true;
                });
                imageSprite.on("mouseup", () => {
                    if (this.isClickImageSplite) this.emit("openModal");
                });

                imageSprite.on("mouseupoutside", () => {
                    if (this.isClickImageSplite) this.emit("openModal");
                });

                container.addChild(imageSprite);
            });
            // 大元コンテナに配置する作業
            container.position.x = containerX;
            container.position.y = containerY;
            index % CONTAINER_TURNING_POINT !== 0
                ? (containerX += container.width + IMAGE_PADDING)
                : (containerX = 0);
            if (index % CONTAINER_TURNING_POINT === 0)
                containerY += container.height + IMAGE_PADDING;

            this.wrapperContainer.addChild(container);

            // リピートのために戻す量を設定
            if (index === 1) {
                this.backPosition.x = -container.width;
                this.backPosition.y = -container.height;
            }
        }

        // 中央に配置
        this.wrapperContainer.position.x =
            -this.wrapperContainer.width / 2 + window.innerWidth / 2;
        this.wrapperContainer.position.y =
            -this.wrapperContainer.height / 2 + window.innerHeight / 2;
        this.wrapperContainer.interactive = true;
        this.setWrapperEvent();

        this.application.stage.addChild(this.wrapperContainer);
        this.clearLoadedImageData();
        this.setDisplayedImageData(this.loadedImagesData);
    }

    resizeView() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        this.application.renderer.resize(width, height);
        this.application.render(this.application.stage);
    }

    setWrapperEvent() {
        // mouse
        this.wrapperContainer.on("mousedown", event => {
            this.press(event);
        });
        this.wrapperContainer.on("mousemove", event => {
            this.drag(event);
        });
        this.wrapperContainer.on("mouseup", event => {
            this.release(event);
        });
        this.wrapperContainer.on("mouseupoutside", event => {
            this.release(event);
        });
    }

    press(event) {
        this.currentDragPosition = event.data.getLocalPosition(
            this.wrapperContainer.parent
        );
        this.wrapperContainer.isDragging = true;
    }

    release(event) {
        this.wrapperContainer.isDragging = false;
    }

    drag(event) {
        if (this.wrapperContainer.isDragging) {
            // ドラッグなので画像のクリックは無視する
            this.isClickImageSplite = false;

            this.newDragPosition = event.data.getLocalPosition(
                this.wrapperContainer.parent
            );

            // X軸方向
            const distanceX =
                this.newDragPosition.x - this.currentDragPosition.x;
            const newPosX = this.wrapperContainer.position.x + distanceX;

            if (
                newPosX < this.endXPosition.max &&
                newPosX > this.endXPosition.min
            ) {
                this.wrapperContainer.position.x = newPosX;
            }
            if (newPosX >= this.endXPosition.max) {
                this.wrapperContainer.position.x =
                    this.backPosition.x - (newPosX - this.endXPosition.max);
            }
            if (newPosX <= this.endXPosition.min) {
                this.wrapperContainer.position.x =
                    newPosX - this.backPosition.x;
            }

            // Y軸方向
            const distanceY =
                this.newDragPosition.y - this.currentDragPosition.y;
            const newPosY = this.wrapperContainer.position.y + distanceY;
            if (
                newPosY < this.endYPosition.max &&
                newPosY > this.endYPosition.min
            ) {
                this.wrapperContainer.position.y = newPosY;
            }
            if (newPosY >= this.endXPosition.max) {
                this.wrapperContainer.position.y =
                    this.backPosition.y - (newPosY - this.endYPosition.max);
            }
            if (newPosY <= this.endYPosition.min) {
                this.wrapperContainer.position.y =
                    newPosY - this.backPosition.y;
            }

            this.currentDragPosition = this.newDragPosition;
        }
    }

    setEndpoint() {
        this.endXPosition.max = 0;
        this.endXPosition.min = -(
            this.wrapperContainer.width - window.innerWidth
        );

        this.endYPosition.max = 0;
        this.endYPosition.min = -(
            this.wrapperContainer.height - window.innerHeight
        );
    }

    destroyView() {
        this.application.destroy();
    }

    setTotalImagesCount(count) {
        this.totalImageCount = count;
    }

    setImageData(images) {
        this.imageDatas.push(...images);
    }

    clearImageData() {
        this.imageDatas.length = 0;
    }

    setLoadedSolidImageData(images) {
        this.loadedSolidImageData.push(...images);
    }

    setLoadedImageData(images) {
        this.loadedImagesData.push(...images);
    }

    clearLoadedImageData() {
        this.loadedImagesData.length = 0;
    }

    setDisplayedImageData(images) {
        this.displayedImageData.push(...images);
    }

    clearDisplayedImageData() {
        this.displayedImageData.length = 0;
    }
}
