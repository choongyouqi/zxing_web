// Install dependencies: npm install express multer jimp @zxing/library
const path = require("path")
const fs = require("fs")
const express = require("express")
const multer = require("multer")
const {Jimp} = require("jimp")
const {
    MultiFormatReader,
    BarcodeFormat,
    BinaryBitmap,
    HybridBinarizer,
    RGBLuminanceSource,
    DecodeHintType
} = require("@zxing/library")

const app = express()
const upload = multer({dest: "uploads/"})

app.use(express.static("public"))

async function getBinaryBitmap(path) {
    const image = await Jimp.read(path)
    const {width, height, data} = image.bitmap

    // Convert to luminance source
    const luminances = new Uint8ClampedArray(width * height)
    for (let i = 0; i < luminances.length; i++) {
        const r = data[i * 4] // Red channel
        const g = data[i * 4 + 1] // Green channel
        const b = data[i * 4 + 2] // Blue channel
        // Convert to grayscale using a weighted sum (common method)
        luminances[i] = 0.299 * r + 0.587 * g + 0.114 * b
    }
    const luminanceSource = new RGBLuminanceSource(luminances, width, height)
    return new BinaryBitmap(new HybridBinarizer(luminanceSource))
}

// QR Code decoding endpoint
app.post("/decode", upload.single("qrImage"), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({error: "No file uploaded"})
    }

    try {
        const binaryBitmap = await getBinaryBitmap(req.file.path)

        const hints = new Map()
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE, BarcodeFormat.DATA_MATRIX])
        const reader = new MultiFormatReader()
        const result = reader.decode(binaryBitmap, hints)

        fs.unlinkSync(req.file.path) // Clean up uploaded file
        res.json({decodedText: result?.getText() || "No QR code detected"})
    } catch (err) {
        console.error(err)
        res.status(500).json({error: "Error decoding QR code"})
    }
})

app.listen(3000, () => console.log("Server running at http://localhost:3000"))
