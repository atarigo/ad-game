import CoreGraphics
import Foundation
import ImageIO
import UniformTypeIdentifiers

let args = CommandLine.arguments
guard args.count == 3 else {
    fputs("usage: swift slice_survival_hero.swift <sheet.png> <out-dir>\n", stderr)
    exit(2)
}

let sourceURL = URL(fileURLWithPath: args[1])
let outDir = URL(fileURLWithPath: args[2], isDirectory: true)

guard
    let source = CGImageSourceCreateWithURL(sourceURL as CFURL, nil),
    let image = CGImageSourceCreateImageAtIndex(source, 0, nil)
else {
    fputs("failed to read image\n", stderr)
    exit(1)
}

let width = image.width
let height = image.height
let bytesPerPixel = 4
let bytesPerRow = width * bytesPerPixel
var pixels = [UInt8](repeating: 0, count: height * bytesPerRow)

guard let ctx = CGContext(
    data: &pixels,
    width: width,
    height: height,
    bitsPerComponent: 8,
    bytesPerRow: bytesPerRow,
    space: CGColorSpaceCreateDeviceRGB(),
    bitmapInfo: CGBitmapInfo.byteOrder32Big.rawValue | CGImageAlphaInfo.premultipliedLast.rawValue
) else {
    fputs("failed to create bitmap context\n", stderr)
    exit(1)
}

ctx.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))

let directions = ["down", "up", "right", "left"]
let frames = ["idle", "walk1", "walk2", "work1", "work2"]
let cols = frames.count
let rows = directions.count

func alphaForPixel(r: UInt8, g: UInt8, b: UInt8) -> UInt8 {
    let ri = Int(r), gi = Int(g), bi = Int(b)
    if ri > 235 && bi > 235 && gi < 45 { return 0 }
    if ri > 215 && bi > 215 && gi < 80 { return 0 }
    if ri > 110 && bi > 110 && gi < 95 && (ri - gi) + (bi - gi) > 170 { return 0 }
    return 255
}

func writePNG(_ image: CGImage, to url: URL) -> Bool {
    guard let dest = CGImageDestinationCreateWithURL(url as CFURL, UTType.png.identifier as CFString, 1, nil) else {
        return false
    }
    CGImageDestinationAddImage(dest, image, nil)
    return CGImageDestinationFinalize(dest)
}

for row in 0..<rows {
    for col in 0..<cols {
        let sourceRow = row == 2 ? 3 : row
        let mirrorX = row == 2
        let x0 = Int(round(Double(col * width) / Double(cols)))
        let x1 = Int(round(Double((col + 1) * width) / Double(cols)))
        let y0 = Int(round(Double(sourceRow * height) / Double(rows)))
        let y1 = Int(round(Double((sourceRow + 1) * height) / Double(rows)))
        let cellW = x1 - x0
        let cellH = y1 - y0
        var cell = [UInt8](repeating: 0, count: cellW * cellH * bytesPerPixel)

        var minX = cellW
        var minY = cellH
        var maxX = -1
        var maxY = -1

        for y in 0..<cellH {
            for x in 0..<cellW {
                let src = (y0 + y) * bytesPerRow + (x0 + x) * bytesPerPixel
                let dst = (y * cellW + x) * bytesPerPixel
                let r = pixels[src]
                let g = pixels[src + 1]
                let b = pixels[src + 2]
                let a = alphaForPixel(r: r, g: g, b: b)
                if a == 0 {
                    cell[dst] = 0
                    cell[dst + 1] = 0
                    cell[dst + 2] = 0
                    cell[dst + 3] = 0
                } else {
                    cell[dst] = r
                    cell[dst + 1] = g
                    cell[dst + 2] = b
                    cell[dst + 3] = a
                }
                if a > 0 {
                    minX = min(minX, x)
                    minY = min(minY, y)
                    maxX = max(maxX, x)
                    maxY = max(maxY, y)
                }
            }
        }

        guard maxX >= minX && maxY >= minY else {
            fputs("empty cell \(directions[row]) \(frames[col])\n", stderr)
            exit(1)
        }

        let cropW = maxX - minX + 1
        let cropH = maxY - minY + 1
        let targetW = row >= 2 ? 48.0 : 46.0
        let scale = min(targetW / Double(cropW), 62.0 / Double(cropH))
        let drawW = max(1, Int(round(Double(cropW) * scale)))
        let drawH = max(1, Int(round(Double(cropH) * scale)))
        var crop = [UInt8](repeating: 0, count: cropW * cropH * bytesPerPixel)

        for y in 0..<cropH {
            for x in 0..<cropW {
                let sourceX = mirrorX ? maxX - x : minX + x
                let src = ((minY + y) * cellW + sourceX) * bytesPerPixel
                let dst = (y * cropW + x) * bytesPerPixel
                crop[dst] = cell[src]
                crop[dst + 1] = cell[src + 1]
                crop[dst + 2] = cell[src + 2]
                crop[dst + 3] = cell[src + 3]
            }
        }

        guard
            let cropCtx = CGContext(
                data: &crop,
                width: cropW,
                height: cropH,
                bitsPerComponent: 8,
                bytesPerRow: cropW * bytesPerPixel,
                space: CGColorSpaceCreateDeviceRGB(),
                bitmapInfo: CGBitmapInfo.byteOrder32Big.rawValue | CGImageAlphaInfo.premultipliedLast.rawValue
            ),
            let cropImage = cropCtx.makeImage()
        else {
            fputs("failed to create crop image\n", stderr)
            exit(1)
        }

        var output = [UInt8](repeating: 0, count: 48 * 64 * bytesPerPixel)
        guard let outCtx = CGContext(
            data: &output,
            width: 48,
            height: 64,
            bitsPerComponent: 8,
            bytesPerRow: 48 * bytesPerPixel,
            space: CGColorSpaceCreateDeviceRGB(),
            bitmapInfo: CGBitmapInfo.byteOrder32Big.rawValue | CGImageAlphaInfo.premultipliedLast.rawValue
        ) else {
            fputs("failed to create output context\n", stderr)
            exit(1)
        }

        outCtx.interpolationQuality = .high
        let dx = (48 - drawW) / 2
        let dy = 64 - drawH - 1
        outCtx.draw(cropImage, in: CGRect(x: dx, y: dy, width: drawW, height: drawH))

        guard let finalImage = outCtx.makeImage() else {
            fputs("failed to create output image\n", stderr)
            exit(1)
        }

        let name = "hero-\(directions[row])-\(frames[col]).png"
        let url = outDir.appendingPathComponent(name)
        guard writePNG(finalImage, to: url) else {
            fputs("failed to write \(name)\n", stderr)
            exit(1)
        }
        print(url.path)
    }
}
