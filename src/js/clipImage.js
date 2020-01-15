// 画像を角丸正方形に切り抜く関数
const ROUND_SIZE = 5;

export default function clipImage(imageUrl, size) {
    return new Promise(resolve => {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");

        ctx.beginPath();
        drawRoundSquare(ctx, size);
        ctx.clip();

        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            ctx.beginPath();
            ctx.drawImage(img, 0, 0, size, size);

            resolve(canvas.toDataURL("image/png"));
        };

        img.onerror = () => resolve();

        img.src = imageUrl;
    });
}

function drawRoundSquare(ctx, size) {
    ctx.beginPath();
    ctx.moveTo(0, 0 + ROUND_SIZE);
    ctx.arc(
        ROUND_SIZE,
        size - ROUND_SIZE,
        ROUND_SIZE,
        Math.PI,
        Math.PI * 0.5,
        true
    );
    ctx.arc(
        size - ROUND_SIZE,
        size - ROUND_SIZE,
        ROUND_SIZE,
        Math.PI * 0.5,
        0,
        1
    );
    ctx.arc(size - ROUND_SIZE, ROUND_SIZE, ROUND_SIZE, 0, Math.PI * 1.5, 1);
    ctx.arc(ROUND_SIZE, ROUND_SIZE, ROUND_SIZE, Math.PI * 1.5, Math.PI, 1);
    ctx.closePath();
}
