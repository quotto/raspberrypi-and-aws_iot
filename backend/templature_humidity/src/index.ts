import { TimestreamQuery } from 'aws-sdk';
const queryClient = new TimestreamQuery({ region: 'us-east-2' });
const certificatedDomains = ['http://localhost', 'http://raspberrypi-cpu-temp.s3-website-ap-northeast-1.amazonaws.com'];

interface TimeStreamItem {
    time: number, temp: number, humidity: number
};
interface Response {
    statusCode: number,
    headers: {
        'Access-Control-Allow-Origin'? : string
    }
    body?: string
}

const domainCheck = (origin: string): boolean => {
    return certificatedDomains.indexOf(origin) >= 0
}
const scanAllData = async (query: string, nextToken?: string): Promise<Array<TimeStreamItem>> => {
    let items: Array<TimeStreamItem> = [];
    const params: TimestreamQuery.QueryRequest = {
        QueryString: query
    }
    if (nextToken) {
        params.NextToken = nextToken;
    }

    const response = await queryClient.query(params).promise();
    if (response.NextToken) {
        const nextRows = await scanAllData(query, response.NextToken)
        items = items.concat(nextRows);
    }

    response.Rows.forEach(row => {
        const rowData: { time: number, temp: number, humidity: number } = {
            time: 0, temp: 0, humidity: 0
        };
        row.Data.forEach((data, index) => {
            const columnName = response.ColumnInfo[index].Name;
            if (columnName) {
                rowData[columnName] = data.ScalarValue;
            }
        })
        items.push(rowData);
    })
    return items;
}
export const handler = async function (event, context): Promise<Response> {
    const response: Response = {
        statusCode: 404,
        headers: {
            'Access-Control-Allow-Origin': event.headers.origin
        }
    };

    console.log(JSON.stringify(event));
    if (domainCheck(event.headers.origin)) {
        let end_dateISOString = new Date().toISOString().substr(0, 19) + '+09:00';
        let begin_dateISOString = new Date(Date.now() - (24 * 60 * 60 * 1000)).toISOString().substr(0, 19) + '+09:00';
        if (event.queryStringParameters && event.queryStringParameters['start'] && event.queryStringParameters['end']) {
            begin_dateISOString = `${event.queryStringParameters['start']}T00:00:00+09:00`;
            end_dateISOString = `${event.queryStringParameters['end']}T23:59:59+09:00`;
        }
        const query = ` WITH temps AS (
select time,measure_value::double as temp from "raspberrypiDB"."temp_and_humidity_table"
where measure_name = 'temp'
order by time
),humidities as (
select measure_value::double as humidity,time from "raspberrypiDB"."temp_and_humidity_table" where measure_name = 'humidity' order by time
)
select to_iso8601(a.time) as time,a.temp,b.humidity from temps a left outer join humidities b on a.time=b.time where a.time >= from_iso8601_timestamp('${begin_dateISOString}') and a.time <= from_iso8601_timestamp('${end_dateISOString}') order by a. time
        `;
        try {
            const result_items = await scanAllData(query, undefined);
            response.statusCode = 200
            response.body = JSON.stringify(result_items);
        } catch (error) {
            console.error(error);
            response.statusCode = 500
            response.body = 'Internal Server Error'
        }
    }
    return response;
}