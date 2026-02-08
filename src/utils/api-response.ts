import HttpStatusCodes from "./HTTP_STATUS_CODES";

class ApiResponse {

    statusCode:number;
    message: string;
    data: any;
    extra?:any;
    success:boolean;
    errors:any[];

    constructor(statusCode:number,message: string, data:any, extra?: any, errors?: any) {
        this.message = message
        this.statusCode = statusCode || HttpStatusCodes.OK;
        this.data = data;
        this.extra = extra;
        this.success=true;
        this.errors = [];
        console.log(this); // for error logs
    }
}

export default ApiResponse;