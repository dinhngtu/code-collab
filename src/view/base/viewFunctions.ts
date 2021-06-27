export async function input(inputter : () => Promise<string | undefined | null>) {
    let result = await inputter();
    if(!result) {
        throw new Error("Input aborted by user");
    }
    return result;
}