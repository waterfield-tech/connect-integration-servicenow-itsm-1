var https = require('https');
exports.handler = function (contact, context, callback) {
    var params = contact.Details;
    params.callback = callback;
    getProcessFunctions(params);
   
    getPhoneRequestData(params);
    getPhoneRequestOptions(params);
    getData(params, "processUserName");
};

var getProcessFunctions = function(params){
    params.execute = function(key, params, body){
            params.funcs[key](params, body);
    };
    params.funcs = {
        "returnToConnect" :  function(params, body){
            var states = ["New","Active","Awaiting Problem", "Awaiting User Info", "Awaiting Evidence", "Resolved", "Closed"];
            var responseObj = JSON.parse(body);
            if(responseObj.result){

                responseObj.result.map(function(item){
                    item.state = states[parseInt(item.state) - 1];
                    return item;
                });
                params.callback(null, responseObj);
            }
            else{
                params.callback(null,JSON.parse('{"Error": "No incidents related"}'));
            }
        },
        "processUserName" : function (params, body){
            var userObj = JSON.parse(body);            
            if(userObj.result.length > 0){
                params.sys_id = userObj.result[0].sys_id;
                getRequestData(params);
                console.log(params.sys_id);
                getRequestOptions(params, `/api/now/table/incident?sysparm_query=caller_id%3D${params.sys_id}&sysparm_fields=number,state,sys_created_by`);
                getData(params, "returnToConnect");
            }
            else{
                params.execute("returnToConnect",params,'""');
            }
        }
    };
}


var getData = function (params, key) {    
    var get_request = https.request(params.get_options, function (res) {
        var body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => params.execute(key, params, body));
        res.on('error', e => context.fail('error:' + e.message));
    });    
    get_request.write(params.get_data);
    get_request.end();
};

var getRequestOptions = function(params, path){
    params.get_options = {
        host: process.env.SERVICENOW_HOST,
        port: '443',
        path: path,
        method: 'get',
        headers: {
            "Content-Type": 'application/json',
            Accept: 'application/json',
            Authorization: 'Basic ' + Buffer.from(process.env.SERVICENOW_USERNAME + ":" + process.env.SERVICENOW_PASSWORD).toString('base64'),
        }
    };
};

var getRequestData = function (params) {
    params.requestData = {
         Phone: (params.Parameters.Phone?params.Parameters.Phone:params.ContactData.CustomerEndpoint.Address.substring(2))
    };
    params.get_data = JSON.stringify(params.requestData); 
};

var getPhoneRequestOptions = function(params){
    params.get_options = {
        host: process.env.SERVICENOW_HOST,
        port: '443',
        path: `/api/now/table/sys_user?sysparm_query=phone%3D${params.requestData.Phone}^ORmobile_phone%3D${params.requestData.Phone}&sysparm_fields=user_name,sys_id`,
        method: 'get',
        headers: {
            "Content-Type": 'application/json',
            Accept: 'application/json',
            Authorization: 'Basic ' + Buffer.from(process.env.SERVICENOW_USERNAME + ":" + process.env.SERVICENOW_PASSWORD).toString('base64'),
        }
    };
};

var getPhoneRequestData = function (params) {
    params.requestData = {
        Phone: (params.Parameters.Phone?params.Parameters.Phone:params.ContactData.CustomerEndpoint.Address.substring(2)),
    };
    params.get_data = JSON.stringify(params.requestData); 
};