var ctx = document.getElementById('myChart');
import Chart from 'chart.js';
import axios from 'axios';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

const formatResponseData = (response_data) =>{
    const dates = [];
    let current_key = '';
    let current_hour = 0;
    const labels = [];
    const data = [[],[]];
    response_data.forEach(item => {
        // APIが返すtimeの末尾に'Z'が無いのでUTCを明示するために付ける
        const itemDate = dayjs(item.time+'Z').tz('Asia/Tokyo');
        dates.push(`${itemDate.year()}年${itemDate.month()+1}月${itemDate.date()}日 ${itemDate.hour()}時${itemDate.minute()}分`);
        const dateKey = `${itemDate.month()}${itemDate.date()}`
        if (dateKey != current_key) {
            labels.push(`${itemDate.month()+1}月${itemDate.date()}日`);
            current_key = dateKey;
        } else if (itemDate.hour() != current_hour) {
            labels.push(`${itemDate.hour().toString()}時`);
            current_hour = itemDate.hour();
        } else labels.push('');
        data[0].push(item.temp.toString());
        data[1].push(item.humidity.toString());
    });
    return {
        data: data,
        dates: dates,
        labels: labels
    };
}

const drawCahrt = (data,dates,labels)=> {
        myChart = new Chart(ctx, {
            type: 'line',
            label: 'value',
            data: {
                labels: labels,
                datasets: [{
                    label: '室温',
                    data: data[0],
                    backgroundColor: 'rgba(255, 99, 132, 1)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 2,
                    // pointRadius: 1, //点を描かない
                    fill: false, //true: 線より下を塗りつぶす
                    yAxisID: 'y-axis-temp'
                },
                {
                    label: '湿度',
                    data: data[1],
                    backgroundColor: 'rgba(1, 99, 132, 1)',
                    borderColor: 'rgba(1, 99, 132, 1)',
                    borderWidth: 2,
                    // pointRadius: 1, //点を描かない
                    fill: false,
                    yAxisID: 'y-axis-humidity'
                }]
            },
            options: {
                responsive: true,
                tooltips: {
                    mode: 'index',
                    intersect: true, //true: 点にhoverした時だけtooltipを表示
                    callbacks: {
                        beforeLabel: (tooltipItem,chart)=>{
                            return dates[tooltipItem.index];
                        },
                    }
                },
                scales: {
                    xAxes: [{
                        ticks: {
                            fontSize: 12,
                            autoSkip: false //目盛（データ数）が多い場合に自動で非表示とする機能の無効化
                        },
                        scaleLabel: {
                            labelString: '日時',
                            display: true
                        },
                    }],
                    yAxes: [{
                        ticks: {
                            beginAtZero: true,
                            stepSize: 5
                        },
                        scaleLabel: {
                            labelString: '室温(\'C)',
                            display: true
                        },
                        gridLines: {
                            display: false
                        },
                        id: 'y-axis-temp'
                    },
                    {
                        ticks: {
                            beginAtZero: true,
                            stepSize: 5
                        },
                        scaleLabel: {
                            labelString: '湿度(%)',
                            display: true
                        },
                        gridLines: {
                            display: false
                        },
                        position: 'right',
                        id: 'y-axis-humidity'
                    }]
                },
                elements: {
                    line: {
                        tension: 0.4 // ベジェ曲線の有効化
                    }
                }
            }
        });
}

let myChart;
document.getElementById("btn_load").addEventListener("click",(event)=>{
    console.log(document.getElementById("date_start").value);
    const startDate = document.getElementById("date_start").value;
    const endDate = document.getElementById("date_end").value;
    axios.get(`${BACKEND_URL}/temp-and-humidity?start=${startDate}&end=${endDate}`).then(response=>{
        console.log(response.data);
       const dataSet = formatResponseData(response.data) ;
        myChart.data.labels = dataSet.labels;
        myChart.data.datasets[0].data = dataSet.data[0];
        myChart.data.datasets[1].data = dataSet.data[1];
        myChart.options.tooltips.callbacks.beforeLabel = (tooltipItem,chart) =>{
            return dataSet.dates[tooltipItem.index];
        }
        myChart.update();
    })
});

axios.get(`${BACKEND_URL}/temp-and-humidity`).then(response => {
    if (response.status === 200) {
        console.log(response.data);
        const dataSet = formatResponseData(response.data);
       drawCahrt(dataSet.data,dataSet.dates,dataSet.labels);
    } else {
        console.error(response.status)
    }
});