export function calculateShiftEarnings(startMs: number, endMs: number, breaks: {startMs: number, endMs: number}[], rateCents: number): number {
    let breakMs = 0
    for (const b of breaks) {
        breakMs += (b.endMs - b.startMs)
    }
    const paidMs = (endMs - startMs) - breakMs
    return Math.round((paidMs * rateCents) / 3600000)
}
