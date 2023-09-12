// Courtesy of Jamie B.
// Inspired by https://stackoverflow.com/a/33292942
export const sleep = (interval: number): Promise<void> => new Promise(res => setTimeout(res, interval));
