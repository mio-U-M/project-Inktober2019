import * as PIXI from "pixi.js";
import EventEmitter2 from "eventemitter2";
import { max } from "lodash";
import { TweenMax, Sine } from "gsap";
import isPrime from "lib/isPrime.js";
import createDivisor from "lib/createDivisor.js";
import clipImage from "lib/clipImage.js";

const IMAGE_PADDING = 10;
const IMAGE_LIST_SCALE = 0.7;
const IMAGE_SPRITE_SIZE = 260;

const MINIMUM_IMAGECONTANAR_LENGTH = 4;

const CONTAINER_TURNING_POINT = 3;
const CONTAINER_COUNT = 9;

export default class GalleryController extends EventEmitter2 {
    constructor(canvas) {
        super();

        this.canvas = canvas;
        this.application = null;

        this.loader = null;

        this.turningPoint = 0;
        this.displayImageCount = 0;

        // 人物画像たち
        // 読み込み前の画像
        this.imageDatas = {};
        this.totalImageCount = 0;
        // 読み込み完了＆未表示の画像
        this.loadedImagesData = [];
        // 表示済みの画像（スプライト）
        this.displayedImageSprites = [];

        this.wrapperContainer = null;

        // 移動範囲の最大と最小(canvasの座標に合わせて設定)
        this.endXPosition = {};
        this.endYPosition = {};

        // 端にまで来た時に戻る量（リピートに見せるため）
        this.backPosition = {};

        // 画像のクリックか単純なドラッグかの制御
        this.isClickImageSplite = false;

        this.currentDragPosition = {};
        this.newDragPosition = {};

        this.resizeFnc = null;
    }

    async init() {
        this.application = new PIXI.Application({
            width: window.innerWidth,
            height: window.innerHeight,
            view: this.canvas,
            resolution: window.devicePixelRatio || 1,
            autoResize: true,
            backgroundColor: "0x0082ca"
        });

        this.resizeFnc = () => {
            this.resizeView();
        };
        window.addEventListener("resize", this.resizeFnc);

        await this.stageSet();
    }

    async stageSet() {
        // 再描画の場合は一回削除
        if (this.wrapperContainer) {
            this.application.stage.removeChild(this.wrapperContainer);
            this.wrapperContainer.destroy();
            this.wrapperContainer = null;
        }

        // アセット読み込み
        await this.loadAssets(this.totalImageCount < 1);
        this.renderAssets(this.totalImageCount < 1);

        // 座標設定
        this.setEndpoint();
        this.emit("stageStandBy");
    }

    loadAssets() {
        this.loader = PIXI.loader;

        return new Promise(resolve => {
            this.loader.reset();
            return Promise.all(
                Object.values(this.imageDatas).map(element =>
                    clipImage(element, IMAGE_SPRITE_SIZE)
                )
            ).then(result => {
                result.forEach((img, i) => {
                    if (img) this.loader.add(`solid-${i}`, img);
                });
                this.loader.load((loader, resources) => {
                    this.setLoadedImageData(Object.values(resources));
                    resolve();
                });
            });
        });
    }

    renderAssets(isBlank = false) {
        // 大元のコンテナ
        this.wrapperContainer = new PIXI.Container();

        let containerX = 0;
        let containerY = 0;
        // 折り返しポイントの計算（０件の場合はミニマムの値を設定
        this.turningPoint = isBlank
            ? MINIMUM_IMAGECONTANAR_LENGTH
            : this.checkTotalCount(this.totalImageCount);
        // また、０件の時はdisplayImageCountをあらかじめ設定
        if (isBlank) {
            this.displayImageCount = Math.pow(MINIMUM_IMAGECONTANAR_LENGTH, 2);
        }
        // 画像を詰めるコンテナの位置配置
        let singleX = 0;
        let singleY = 0;

        for (let index = 1; index < CONTAINER_COUNT + 1; index++) {
            // 初期化
            singleX = 0;
            singleY = 0;
            // 画像を詰めるコンテナを詰める作業
            const container = new PIXI.Container();

            for (let i = 0; i < this.displayImageCount; i++) {
                const imageIndex = i % this.loadedImagesData.length;
                const imageSprite = new PIXI.Sprite(
                    this.loadedImagesData[imageIndex].texture
                );

                // 位置計算
                if (i > 0) {
                    i % this.turningPoint !== 0
                        ? (singleX +=
                              imageSprite.width * IMAGE_LIST_SCALE +
                              IMAGE_PADDING)
                        : (singleX = 0);
                    if (i % this.turningPoint === 0)
                        singleY +=
                            imageSprite.height * IMAGE_LIST_SCALE +
                            IMAGE_PADDING;
                }
                imageSprite.position.x = singleX;
                imageSprite.position.y = singleY;
                imageSprite.anchor.x = 0.5;
                imageSprite.anchor.y = 0.5;
                imageSprite.scale.x = IMAGE_LIST_SCALE;
                imageSprite.scale.y = IMAGE_LIST_SCALE;

                // 画像が存在する場合は画像にクリックイベントを仕込む
                if (!isBlank) {
                    // 画像にイベントを付与
                    imageSprite.interactive = true;
                    imageSprite.buttonMode = true;
                    imageSprite.cursor = "pointer";
                    // クリック周り
                    imageSprite.on("mousedown", () => {
                        this.isClickImageSplite = true;
                    });
                    imageSprite.on("mouseup", () => {
                        if (this.isClickImageSplite)
                            this.emit(
                                "openModal",
                                Object.keys(this.imageDatas)[imageIndex]
                            );
                    });
                    // マウスオーバー周り
                    imageSprite.on("mouseover", () => {
                        TweenMax.to(imageSprite.scale, 0.3, {
                            x: IMAGE_LIST_SCALE - 0.05,
                            y: IMAGE_LIST_SCALE - 0.05,
                            ease: Sine.easeOut
                        });
                    });
                    imageSprite.on("mouseout", () => {
                        TweenMax.to(imageSprite.scale, 0.3, {
                            x: IMAGE_LIST_SCALE,
                            y: IMAGE_LIST_SCALE,
                            ease: Sine.easeOut
                        });
                    });
                }

                container.addChild(imageSprite);
                // 表示したスプライトを格納
                this.setDisplayedImageSprites(imageSprite);
            }

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
        // 独自プロパティ設定
        this.wrapperContainer.isDragging = true;
    }

    release(event) {
        this.wrapperContainer.isDragging = false;
        // カーソル変更
        this.displayedImageSprites.forEach(sprite => {
            sprite.cursor = "pointer";
        });
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

    // 画像を敷き詰める際のロジック
    // 1. 素数がきたとき→枚数足し合わせて素数じゃないようにする（その際、２と３のルールは乗っ取る）
    // 2. 四角形の１辺の枚数が4枚以下の時→枚数足し合わせて4以上になるまでかさ増ししてその分並べる。
    // 3. 累乗の数がきた時→平方根を計算して正方形にする
    checkTotalCount(num) {
        this.displayImageCount = num;
        // 1. 素数か否か
        // 素数の場合は素数じゃない数になるまで足し合わせる
        while (isPrime(this.displayImageCount)) {
            this.displayImageCount++;
        }
        // 2. 累乗数の対処
        // 累乗数の場合は、一辺の最低数よりも多い場合は平方根の値が１片辺りの数。
        if (
            Math.sqrt(this.displayImageCount) % 1 === 0 &&
            Math.sqrt(this.displayImageCount) >= MINIMUM_IMAGECONTANAR_LENGTH
        ) {
            return Math.sqrt(this.displayImageCount);
        } else {
            // 3. 約数洗い出して対処
            // 上記以外の場合は約数確認して調整。累乗数の以外の場合は真ん中の二つの数字をとれば綺麗な四角形の形になる
            let divisor = createDivisor(this.displayImageCount);

            // 以下の条件に合致した場合は足し合わせる
            // 1. 四角形の返の長さのどちらかがMINIMUM_IMAGECONTANAR_LENGTH以下の時
            // 2. 約数の数が奇数の時（ = 累乗数の時。累乗数の約数は基本奇数個）
            while (
                divisor[divisor.length / 2 - 1] <
                    MINIMUM_IMAGECONTANAR_LENGTH ||
                divisor[divisor.length / 2] < MINIMUM_IMAGECONTANAR_LENGTH ||
                divisor.length % 2 !== 0
            ) {
                this.displayImageCount++;
                divisor = createDivisor(this.displayImageCount);
            }

            return max(
                divisor.slice(divisor.length / 2 - 1, divisor.length / 2 + 1)
            );
        }
    }

    destroyView() {
        window.removeEventListener("resize", this.resizeFnc);
        this.application.destroy();
    }

    isInit() {
        return this.application !== null;
    }

    setImageData(images) {
        this.clearImageData();

        this.imageDatas = { ...images };
        this.totalImageCount = Object.values(this.imageDatas).length;
    }

    clearImageData() {
        this.imageDatas = null;
        this.totalImageCount = 0;
    }

    getTotalImageCount() {
        return this.totalImageCount;
    }

    setLoadedImageData(images) {
        this.loadedImagesData.push(...images);
    }

    clearLoadedImageData() {
        this.loadedImagesData.length = 0;
    }

    setDisplayedImageSprites(images) {
        this.displayedImageSprites.push(images);
    }

    clearDisplayedImageSprites() {
        this.displayedImageSprites.length = 0;
    }
}
