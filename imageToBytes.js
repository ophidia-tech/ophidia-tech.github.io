#! /usr/local/bin/node

const IMAGE_WIDTH = 104;
const IMAGE_HEIGHT = 212;
let bytes_rep = "";

const { createCanvas, loadImage } = require("canvas");

var ConversionFunctions = {
    // Output the image as a string for horizontally drawing displays
    horizontal1bit: function (data, canvasWidth, canvasHeight) {
        var output_string = "";
        var output_index = 0;

        var byteIndex = 7;
        var number = 0;

        // format is RGBA, so move 4 steps per pixel
        for (var index = 0; index < data.length; index += 4) {
            // Get the average of the RGB (we ignore A)
            var avg = (data[index] + data[index + 1] + data[index + 2]) / 3;
            if (avg > settings["threshold"]) {
                number += Math.pow(2, byteIndex);
            }
            byteIndex--;

            // if this was the last pixel of a row or the last pixel of the
            // image, fill up the rest of our byte with zeros so it always contains 8 bits
            if (
                (index != 0 && (index / 4 + 1) % canvasWidth == 0) ||
                index == data.length - 4
            ) {
                // for(var i=byteIndex;i>-1;i--){
                // number += Math.pow(2, i);
                // }
                byteIndex = -1;
            }

            // When we have the complete 8 bits, combine them into a hex value
            if (byteIndex < 0) {
                var byteSet = number.toString(16);
                if (byteSet.length == 1) {
                    byteSet = "0" + byteSet;
                }
                var b = "0x" + byteSet;
                output_string += b + ", ";
                output_index++;
                if (output_index >= 16) {
                    output_string += "\n";
                    output_index = 0;
                }
                number = 0;
                byteIndex = 7;
            }
        }
        return output_string;
    },
};

// Filetypes accepted by the file picker
var fileTypes = ["jpg", "jpeg", "png", "bmp", "gif", "svg"];

// A bunch of settings used when converting
var settings = {
    scaleToFit: true,
    preserveRatio: true,
    centerHorizontally: false,
    centerVertically: false,
    flipHorizontally: false,
    flipVertically: false,
    backgroundColor: "black",
    scale: "2",
    drawMode: "horizontal",
    threshold: 150,
    outputFormat: "plain",
    invertColors: false,
    rotate180: false,
    conversionFunction: ConversionFunctions.horizontal1bit,
};

function imageToString(image_path, width = IMAGE_WIDTH, height = IMAGE_HEIGHT) {
    var canvas = createCanvas(parseInt(width), parseInt(height));
    var ctx = canvas.getContext("2d");

    loadImage(image_path).then((image) => {
        ctx.drawImage(image, 0, 0, width, height);
        place_image(image, canvas);

        var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        var data = imageData.data;

        // console.log(
        //     settings.conversionFunction(data, canvas.width, canvas.height)
        // );

        bytes_rep = settings.conversionFunction(
            data,
            canvas.width,
            canvas.height
        );

        console.log(bytes_rep);
    });
}

// Draw the image onto the canvas, taking into account color and scaling
function place_image(image, cvs) {
    var img = image;
    var canvas = cvs;
    var ctx = canvas.getContext("2d");

    // Invert background if needed
    if (settings["backgroundColor"] == "transparent") {
        ctx.fillStyle = "rgba(0,0,0,0.0)";
        ctx.globalCompositeOperation = "copy";
    } else {
        if (settings["invertColors"]) {
            settings["backgroundColor"] == "white"
                ? (ctx.fillStyle = "black")
                : (ctx.fillStyle = "white");
        } else {
            ctx.fillStyle = settings["backgroundColor"];
        }
        ctx.globalCompositeOperation = "source-over";
    }
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.setTransform(1, 0, 0, 1, 0, 0); // start with identity matrix transform (no rotation).
    if (settings["rotate180"]) {
        // Matrix transformation
        ctx.translate(canvas.width / 2.0, canvas.height / 2.0);
        ctx.rotate(Math.PI);
        ctx.translate(-canvas.width / 2.0, -canvas.height / 2.0);
    }

    // Offset used for centering the image when requested
    var offset_x = 0;
    var offset_y = 0;

    switch (settings["scale"]) {
        case "1": // Original
            if (settings["centerHorizontally"]) {
                offset_x = Math.round((canvas.width - img.width) / 2);
            }
            if (settings["centerVertically"]) {
                offset_y = Math.round((canvas.height - img.height) / 2);
            }
            ctx.drawImage(
                img,
                0,
                0,
                img.width,
                img.height,
                offset_x,
                offset_y,
                img.width,
                img.height
            );
            break;
        case "2": // Fit (make as large as possible without changing ratio)
            var horRatio = canvas.width / img.width;
            var verRatio = canvas.height / img.height;
            var useRatio = Math.min(horRatio, verRatio);

            if (settings["centerHorizontally"]) {
                offset_x = Math.round(
                    (canvas.width - img.width * useRatio) / 2
                );
            }
            if (settings["centerVertically"]) {
                offset_y = Math.round(
                    (canvas.height - img.height * useRatio) / 2
                );
            }
            ctx.drawImage(
                img,
                0,
                0,
                img.width,
                img.height,
                offset_x,
                offset_y,
                img.width * useRatio,
                img.height * useRatio
            );
            break;
        case "3": // Stretch x+y (make as large as possible without keeping ratio)
            ctx.drawImage(
                img,
                0,
                0,
                img.width,
                img.height,
                offset_x,
                offset_y,
                canvas.width,
                canvas.height
            );
            break;
        case "4": // Stretch x (make as wide as possible)
            offset_x = 0;
            if (settings["centerVertically"]) {
                Math.round((offset_y = (canvas.height - img.height) / 2));
            }
            ctx.drawImage(
                img,
                0,
                0,
                img.width,
                img.height,
                offset_x,
                offset_y,
                canvas.width,
                img.height
            );
            break;
        case "5": // Stretch y (make as tall as possible)
            if (settings["centerHorizontally"]) {
                offset_x = Math.round((canvas.width - img.width) / 2);
            }
            offset_y = 0;
            ctx.drawImage(
                img,
                0,
                0,
                img.width,
                img.height,
                offset_x,
                offset_y,
                img.width,
                canvas.height
            );
            break;
    }
    // Make sure the image is black and white
    if (settings.conversionFunction == ConversionFunctions.horizontal1bit) {
        blackAndWhite(canvas, ctx);
        if (settings["invertColors"]) {
            invert(canvas, ctx);
        }
    }

    // Flip image if needed
    if (settings["flipHorizontally"]) {
        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(canvas, -canvas.width, 0);
        ctx.restore();
    }
    if (settings["flipVertically"]) {
        ctx.save();
        ctx.scale(1, -1);
        ctx.drawImage(canvas, 0, -canvas.height);
        ctx.restore();
    }

    // console.log(canvas.toDataURL());
}

// Make the canvas black and white
function blackAndWhite(canvas, ctx) {
    var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    var data = imageData.data;
    for (var i = 0; i < data.length; i += 4) {
        var avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        avg > settings["threshold"] ? (avg = 255) : (avg = 0);
        data[i] = avg; // red
        data[i + 1] = avg; // green
        data[i + 2] = avg; // blue
    }
    ctx.putImageData(imageData, 0, 0);
}
// main function:
function main() {
    const file_path = process.argv[2];
    const width = process.argv[3];
    const height = process.argv[4];
    imageToString(file_path, width, height);
}

if (require.main === module) {
    main();
}
