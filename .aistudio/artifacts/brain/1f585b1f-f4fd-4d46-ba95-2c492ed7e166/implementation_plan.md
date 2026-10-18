# Remove Right-Side Shadow Effects & Connect Spiral Rings Into Holes (Single #10)

## 1. Keep Shadows Strictly Underneath Vertical Standing Books (No Right-Side Shadow)
- **What we are changing**:
  - In `src/utils/canvas3DRenderer.ts`, remove the sideways directional cast shadow (`primaryCast` / `castX`) and wide horizontal halo (`wideAO`) that extended out to the right side of vertical standing books (including Single #1 `Standing Hardcover`, #3 `Front-Facing Hardcover`, #5 `Thick Boxed Omnibus`, and all vertical standing books in Single & Composite).
  - Remove the right-edge shadow gradient (`0.88 -> 1.0`) on the front cover texture (`makeCoverTex`) and right board rim (`rightRimTex`).
  - Configure the 3D floor shadow for vertical standing books so it stays **strictly underneath (`only nichei`)** the bottom base of each book—hugging the exact width and bottom contour of the book without spilling out to the right side.

## 2. Thread Spiral Springs Directly Into the Left-Side Holes (Single #10)
- **What we are changing**:
  - In `src/utils/canvas3DRenderer.ts` (`makeCoverTex('spiral')` and `buildAnatomicalBook3D`), synchronize the exact vertical `Y` coordinates (`hy = (0.5 - ry / H) * height`) and horizontal `X` coordinate (`holeX`) of all 18 punched holes on the front cover with the 3D twin-loop wire-o springs.
  - Compute the exact circle intersection center (`centerX = holeX - sqrt(ringRadius² - (T/2)²)`) and render metallic 3D wire-o rings with inner hole rim depth so every spring visibly pierces directly into the center of its punched hole along the left edge of the workbook.
