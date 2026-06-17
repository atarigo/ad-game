import CoreGraphics
import Foundation
import ImageIO
import UniformTypeIdentifiers

struct OutputSpec {
    let name: String
    let width: Int
    let height: Int
    let maxDrawWidth: Double
    let maxDrawHeight: Double
}

let args = CommandLine.arguments
guard args.count == 4 else {
    fputs("usage: swift slice_survival_object_sheet.swift <sheet.png> <out-dir> <tree|bear|stations>\n", stderr)
    exit(2)
}

let sourceURL = URL(fileURLWithPath: args[1])
let outDir = URL(fileURLWithPath: args[2], isDirectory: true)
let mode = args[3]

let specs: [OutputSpec]
switch mode {
case "tree":
    specs = [
        OutputSpec(name: "tree-full.png", width: 64, height: 80, maxDrawWidth: 60, maxDrawHeight: 76),
        OutputSpec(name: "tree-damaged.png", width: 64, height: 80, maxDrawWidth: 60, maxDrawHeight: 76),
        OutputSpec(name: "tree-stump.png", width: 64, height: 80, maxDrawWidth: 50, maxDrawHeight: 40)
    ]
case "bear":
    specs = [
        OutputSpec(name: "boar-idle.png", width: 56, height: 48, maxDrawWidth: 50, maxDrawHeight: 42),
        OutputSpec(name: "boar-walk1.png", width: 56, height: 48, maxDrawWidth: 50, maxDrawHeight: 42),
        OutputSpec(name: "boar-walk2.png", width: 56, height: 48, maxDrawWidth: 50, maxDrawHeight: 42),
        OutputSpec(name: "boar-hit.png", width: 56, height: 48, maxDrawWidth: 50, maxDrawHeight: 42),
        OutputSpec(name: "bear-attack1.png", width: 56, height: 64, maxDrawWidth: 50, maxDrawHeight: 60),
        OutputSpec(name: "bear-attack2.png", width: 56, height: 64, maxDrawWidth: 50, maxDrawHeight: 52)
    ]
case "stations":
    specs = [
        OutputSpec(name: "wood-station.png", width: 80, height: 64, maxDrawWidth: 76, maxDrawHeight: 60),
        OutputSpec(name: "meat-station.png", width: 80, height: 64, maxDrawWidth: 76, maxDrawHeight: 60),
        OutputSpec(name: "meal-shop.png", width: 80, height: 64, maxDrawWidth: 78, maxDrawHeight: 60)
    ]
default:
    fputs("unknown mode \(mode)\n", stderr)
    exit(2)
}

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

func alphaForPixel(r: UInt8, g: UInt8, b: UInt8) -> UInt8 {
    let ri = Int(r), gi = Int(g), bi = Int(b)
    if ri > 235 && bi > 235 && gi < 45 { return 0 }
    if ri > 200 && bi > 200 && gi < 100 && (ri - gi) + (bi - gi) > 180 { return 0 }
    if ri > 145 && bi > 145 && gi < 115 && (ri - gi) + (bi - gi) > 130 { return 0 }
    return 255
}

func writePNG(_ image: CGImage, to url: URL) -> Bool {
    guard let dest = CGImageDestinationCreateWithURL(url as CFURL, UTType.png.identifier as CFString, 1, nil) else {
        return false
    }
    CGImageDestinationAddImage(dest, image, nil)
    return CGImageDestinationFinalize(dest)
}

func renderCrop(
    sourcePixels: [UInt8],
    sourceWidth: Int,
    cropX: Int,
    cropY: Int,
    cropW: Int,
    cropH: Int,
    spec: OutputSpec,
    horizontalOffset: Int = 0
) {
    var crop = [UInt8](repeating: 0, count: cropW * cropH * bytesPerPixel)
    let sourceBytesPerRow = sourceWidth * bytesPerPixel
    for y in 0..<cropH {
        for x in 0..<cropW {
            let src = (cropY + y) * sourceBytesPerRow + (cropX + x) * bytesPerPixel
            let dst = (y * cropW + x) * bytesPerPixel
            crop[dst] = sourcePixels[src]
            crop[dst + 1] = sourcePixels[src + 1]
            crop[dst + 2] = sourcePixels[src + 2]
            crop[dst + 3] = sourcePixels[src + 3]
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

    let scale = min(spec.maxDrawWidth / Double(cropW), spec.maxDrawHeight / Double(cropH))
    let drawW = max(1, Int(round(Double(cropW) * scale)))
    let drawH = max(1, Int(round(Double(cropH) * scale)))
    var output = [UInt8](repeating: 0, count: spec.width * spec.height * bytesPerPixel)
    guard let outCtx = CGContext(
        data: &output,
        width: spec.width,
        height: spec.height,
        bitsPerComponent: 8,
        bytesPerRow: spec.width * bytesPerPixel,
        space: CGColorSpaceCreateDeviceRGB(),
        bitmapInfo: CGBitmapInfo.byteOrder32Big.rawValue | CGImageAlphaInfo.premultipliedLast.rawValue
    ) else {
        fputs("failed to create output context\n", stderr)
        exit(1)
    }

    outCtx.interpolationQuality = .high
    let dx = max(0, min(spec.width - drawW, (spec.width - drawW) / 2 + horizontalOffset))
    let dy = spec.height - drawH - 1
    outCtx.draw(cropImage, in: CGRect(x: dx, y: dy, width: drawW, height: drawH))

    guard let finalImage = outCtx.makeImage() else {
        fputs("failed to create output image\n", stderr)
        exit(1)
    }

    let url = outDir.appendingPathComponent(spec.name)
    guard writePNG(finalImage, to: url) else {
        fputs("failed to write \(spec.name)\n", stderr)
        exit(1)
    }
    print("\(url.path) \(drawW)x\(drawH)")
}

if mode == "bear" {
    var keyed = pixels
    var foreground = [Bool](repeating: false, count: width * height)
    for y in 0..<height {
        for x in 0..<width {
            let idx = y * width + x
            let p = y * bytesPerRow + x * bytesPerPixel
            let a = alphaForPixel(r: keyed[p], g: keyed[p + 1], b: keyed[p + 2])
            if a == 0 {
                keyed[p] = 0
                keyed[p + 1] = 0
                keyed[p + 2] = 0
                keyed[p + 3] = 0
            } else {
                keyed[p + 3] = a
                foreground[idx] = true
            }
        }
    }

    var visited = [Bool](repeating: false, count: width * height)
    var components: [(count: Int, minX: Int, minY: Int, maxX: Int, maxY: Int)] = []
    var stack: [Int] = []
    let minimumPixels = 4000

    for start in 0..<(width * height) {
        if !foreground[start] || visited[start] { continue }
        visited[start] = true
        stack.removeAll(keepingCapacity: true)
        stack.append(start)
        var count = 0
        var minX = width
        var minY = height
        var maxX = -1
        var maxY = -1

        while let current = stack.popLast() {
            let x = current % width
            let y = current / width
            count += 1
            minX = min(minX, x)
            minY = min(minY, y)
            maxX = max(maxX, x)
            maxY = max(maxY, y)

            if x > 0 {
                let n = current - 1
                if foreground[n] && !visited[n] { visited[n] = true; stack.append(n) }
            }
            if x + 1 < width {
                let n = current + 1
                if foreground[n] && !visited[n] { visited[n] = true; stack.append(n) }
            }
            if y > 0 {
                let n = current - width
                if foreground[n] && !visited[n] { visited[n] = true; stack.append(n) }
            }
            if y + 1 < height {
                let n = current + width
                if foreground[n] && !visited[n] { visited[n] = true; stack.append(n) }
            }
        }

        if count >= minimumPixels {
            components.append((count, minX, minY, maxX, maxY))
        }
    }

    components.sort { a, b in
        let ax = (a.minX + a.maxX) / 2
        let bx = (b.minX + b.maxX) / 2
        return ax < bx
    }

    guard components.count >= specs.count else {
        fputs("expected \(specs.count) bear components, found \(components.count)\n", stderr)
        exit(1)
    }

    for (index, spec) in specs.enumerated() {
        let c = components[index]
        let padX = 12
        let padY = 10
        let x0 = max(0, c.minX - padX)
        let y0 = max(0, c.minY - padY)
        let x1 = min(width - 1, c.maxX + padX)
        let y1 = min(height - 1, c.maxY + padY)
        renderCrop(
            sourcePixels: keyed,
            sourceWidth: width,
            cropX: x0,
            cropY: y0,
            cropW: x1 - x0 + 1,
            cropH: y1 - y0 + 1,
            spec: spec,
            horizontalOffset: 1
        )
    }
    exit(0)
}

for (index, spec) in specs.enumerated() {
    let x0 = Int(round(Double(index * width) / Double(specs.count)))
    let x1 = Int(round(Double((index + 1) * width) / Double(specs.count)))
    let cellW = x1 - x0
    let cellH = height
    var cell = [UInt8](repeating: 0, count: cellW * cellH * bytesPerPixel)
    var minX = cellW
    var minY = cellH
    var maxX = -1
    var maxY = -1

    for y in 0..<cellH {
        for x in 0..<cellW {
            let src = y * bytesPerRow + (x0 + x) * bytesPerPixel
            let dst = (y * cellW + x) * bytesPerPixel
            let r = pixels[src]
            let g = pixels[src + 1]
            let b = pixels[src + 2]
            let a = alphaForPixel(r: r, g: g, b: b)
            cell[dst] = a == 0 ? 0 : r
            cell[dst + 1] = a == 0 ? 0 : g
            cell[dst + 2] = a == 0 ? 0 : b
            cell[dst + 3] = a
            if a > 0 {
                minX = min(minX, x)
                minY = min(minY, y)
                maxX = max(maxX, x)
                maxY = max(maxY, y)
            }
        }
    }

    guard maxX >= minX && maxY >= minY else {
        fputs("empty cell \(spec.name)\n", stderr)
        exit(1)
    }

    renderCrop(
        sourcePixels: cell,
        sourceWidth: cellW,
        cropX: minX,
        cropY: minY,
        cropW: maxX - minX + 1,
        cropH: maxY - minY + 1,
        spec: spec
    )
}
