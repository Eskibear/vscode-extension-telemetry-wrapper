export class UserError extends Error {
    constructor(e: Error) {
        super(e.message);
        this.name = e.name;
        this.stack = e.stack
    }
}