import {handler} from '../index';


test('/',async()=>{
    const result = await handler({resource: '/',headers:{origin: 'http://localhost'}},{})
    expect(result?.statusCode).toBe(200);
});
test('/,parameters specified',async()=>{
    const result = await handler({resource: '/',headers:{origin: 'http://localhost'},queryStringParameters:{start: '2020-12-04', end: '2020-12-05'}},{})
    expect(result?.statusCode).toBe(200);
});
test('/,no data',async()=>{
    const result = await handler({resource: '/',headers:{origin: 'http://localhost'},queryStringParameters:{start: '2030-12-04', end: '2030-12-05'}},{})
    expect(result?.statusCode).toBe(200);
    expect(JSON.parse(result?.body!).length).toBe(0);
});