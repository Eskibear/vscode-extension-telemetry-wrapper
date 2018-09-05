export class UserError extends Error {
    constructor(e: Error) {
        super(e.message);
    }
}
