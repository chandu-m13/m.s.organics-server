
class RestError extends Error {

    statusCode:number;
    data: any;
    message: string;
    extra?:any;
    success:boolean;
    errors:any[];

    constructor(statusCode:number,message: string, extra?: any, errors?: any) {
        super();
        this.statusCode = statusCode;
        this.message = message;
        this.data = [];
        this.extra = extra;
        this.success=false;
        this.errors = errors || [];
        console.log(this); // for error logs

        if(Error.captureStackTrace) {
            Error.captureStackTrace(this,RestError);
        }
    }
}

export default RestError;