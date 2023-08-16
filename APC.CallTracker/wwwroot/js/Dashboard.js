(function () {
    'option strict';

    var charts = {};

    //setupDateFilterWidgets
    var $startDatePicker = $("#start-date").kendoDatePicker({ value: new Date() });
    var $endDatePicker = $("#end-date").kendoDatePicker({ value: new Date() });

    $("#btn-apply-filter").click(() => {

        let startDate = $startDatePicker.data("kendoDatePicker").value();
        let endDate = $endDatePicker.data("kendoDatePicker").value();

        refreshDashboard(startDate, endDate);
    });

    $("#btn-apply-filter-today").click(() => {
        let today = new Date();
        $startDatePicker.data("kendoDatePicker").value(today);
        $endDatePicker.data("kendoDatePicker").value(today);
        refreshDashboard(today, today);
    });

    //load all charts, defaulting to today
    refreshDashboard();

    //set dashboard refresh timer, every 2 minutes
    let two_mins = 1000 * 2 * 60;
    setInterval(() => refreshDashboard(), two_mins);

    //set page reload every 60 minutes (due to staying open constantly)
    let sixty_mins = 1000 * 60 * 60;
    setInterval(() => location.reload(), sixty_mins);

    function refreshDashboard(startDate, endDate) {

        if (!startDate)
            startDate = $startDatePicker.data("kendoDatePicker").value();

        if (!endDate)
            endDate = $endDatePicker.data("kendoDatePicker").value();

        //if between 1am and 5am make sure date filters are updated to today (for Dashboard display to avoid setting every new day to today)
        var today = new Date();
        var currentHour = today.getHours();

        if (currentHour >= 1 && currentHour <= 5) {
            $startDatePicker.data("kendoDatePicker").value(today);
            $endDatePicker.data("kendoDatePicker").value(today);
            return; //don't bother refreshing data between 1-5am (Dashboard is usually left open indefinitely)
        }

        loadCharts(startDate, endDate);

        if (window.apc.userName === "Dashboard") {
            loadPerformanceSummaryGrid();
        }
        else {
            setTimeout(() => {
                loadPerformanceReport(startDate, endDate);
            }, 1250);
        }

        var updateTime = moment(new Date()).format('hh:mm A');

        $(".last-refresh-message").text(`Dashboard refreshed: ${updateTime}`);
    }

    //async function getPerformanceSummaryDataAsync() {

    //    return await (await fetch()).json();
    //}

    function getPerformanceSummaryData() {
        
        return fetch("./Home/EmployeePerformanceSummaryToday")
                .then(function (response) {
                    return response.json();
                });
    }

    function loadPerformanceSummaryGrid() {

        let $grid = $("#reportGrid");
        getPerformanceSummaryData()
            .then(data => {
                loadGridData(data);
            });

        function loadGridData(data) {
            $grid.kendoGrid({
                dataSource: {
                    data: data,
                    schema: {
                        model: {
                            fields: {
                                Employee: { type: "string" },
                                Rank: { type: "number" },
                                TotalLinesCleared: { type: "number" },
                                AllCalls: { type: "number" },
                                InboundCalls: { type: "number" },
                                OutboundCalls: { type: "number" },
                                NewCallRecords: { type: "number" },
                                NoCallRecords: { type: "number" },
                                MessagesLeft: { type: "number" },
                                Form2067Requested: { type: "number" },
                            }
                        }
                    }
                },
                height: 550,
                columns: [{
                    field: "Employee",
                    width: 200
                },
                {
                    field: "Rank",
                    //width: 50
                },
                {
                    field: "TotalLinesCleared",
                    title: "Lines",
                    //width: 50
                },
                {
                    field: "AllCalls",
                    title: "All Calls"
                },
                {
                    field: "InboundCalls",
                    title: "Inbound"
                },
                {
                    field: "OutboundCalls",
                    title: "Outbound"
                },
                {
                    field: "NoCallRecords",
                    title: "No-Calls"
                },
                {
                    field: "NewCallRecords",
                    title: "New-Calls"
                },
                {
                    field: "MessagesLeft",
                    title: "Messages"
                },
                {
                    field: "Form2067Requested",
                    title: "2067's"
                }
                ]
            });
        }
    }

    //async function loadChartsAsync(startDate, endDate) {

    //    var agentStats = await loadChartData_EmployeePerformanceSummariesAsync(startDate, endDate);
    //    loadChart_TotalCalls(agentStats, startDate, endDate);

    //    //var totalLinesData = await loadChartData_TotalLines(startDate, endDate);
    //    loadChart_TotalLines(agentStats, startDate, endDate);
    //}

    function loadCharts(startDate, endDate) {

        loadChartData_EmployeePerformanceSummaries(startDate, endDate)
            .then(data => {
                loadChart_TotalCalls(data);
                loadChart_TotalLines(data);
            });
    }

    function loadPerformanceReport(startDate, endDate) {
        startDate = moment(startDate).format('YYYY-MM-DD');
        endDate = moment(endDate).format('YYYY-MM-DD');
        var reportUrl = `http://reportserver/reports/report/Call%20Center/Employee%20Performance%20Summary?rs:Embed=true&rs:ClearSession=true&rc:Parameters=false&rc:Toolbar=true&startDate=${startDate}&endDate=${endDate}`;
        document.getElementById("performance-report-frame").src = reportUrl;
    }

    function loadChartData_EmployeePerformanceSummaries(startDate, endDate) {

        startDate = moment(startDate).format('YYYY-MM-DD');
        endDate = moment(endDate).format('YYYY-MM-DD');

        let url = `./Home/EmployeePerformanceSummaries?${$.param({ startDate: startDate, endDate: endDate })}`;

        return fetch(url)
            .then(function (response) {
                return response.json();
            });
    }

    //async function loadChartData_EmployeePerformanceSummariesAsync(startDate, endDate) {

    //    startDate = moment(startDate).format('YYYY-MM-DD');
    //    endDate = moment(endDate).format('YYYY-MM-DD');

    //    let url = `./Home/EmployeePerformanceSummaries?${$.param({ startDate: startDate, endDate: endDate })}`;

    //    return await (await fetch(url)).json();
    //}

    function loadChart_TotalCalls(data) {

        let calls = Enumerable.from(data)
            .where(r => r.InboundCalls > 0 || r.OutboundCalls > 0)
            .orderByDescending(r => r.AllCalls)
            .toArray();

        let employeeNames = Enumerable.from(calls)
            .select(r => r.Employee).toArray();

        let inboundCalls = Enumerable.from(calls)
            .select(r => r.InboundCalls)
            .toArray();

        let outboundCalls = Enumerable.from(calls)
            .select(r => r.OutboundCalls)
            .toArray();

        let chartData = {
            labels: employeeNames,
            datasets: [{
                label: "Inbound Calls",
                backgroundColor: window.colors.crimson,
                borderWidth: 1,
                data: inboundCalls
            }, {
                label: "Outbound Calls",
                backgroundColor: window.colors.darkorange,
                borderWidth: 1,
                data: outboundCalls
            }]
        };

        //if already initialized, just refresh the data
        let chart = charts.totalCalls;
        if (chart) {
            chart.data.labels = employeeNames;
            chart.data.datasets.forEach((dataset) => {
                if (dataset.label === "Inbound Calls")
                    dataset.data = inboundCalls;

                if (dataset.label === "Outbound Calls")
                    dataset.data = outboundCalls;
            });
            chart.update();
            return;
        }

        let ctx = document.getElementById("chart-total-calls").getContext('2d');
        chart = new Chart(ctx, {
            type: 'horizontalBar',
            plugins: [totalizer],
            data: chartData,
            options: {
                scales: {
                    xAxes: [{
                        stacked: true,
                        ticks: {
                            beginAtZero: true
                        }
                    }],
                    yAxes: [{
                        stacked: true
                    }]
                }
            }
        });

        charts.totalCalls = chart;
    }

    //async function loadChartData_TotalLines(startDate, endDate) {
    //    startDate = moment(startDate).format('YYYY-MM-DD');
    //    endDate = moment(endDate).format('YYYY-MM-DD');

    //    let url = `./Home/ReportNumberOfLinesCleared?${$.param({ startDate: startDate, endDate: endDate })}`;

    //    return await (await fetch(url)).json();
    //}

    function loadChart_TotalLines(data) {

        data = Enumerable.from(data)
            .where(r => r.TotalLinesCleared > 0)
            .orderByDescending(r => r.TotalLinesCleared)
            .toArray();

        let employeeNames = Enumerable.from(data)
            .select(r => r.Employee)
            .toArray();

        let lines = Enumerable.from(data)
            .select(r => r.TotalLinesCleared)
            .toArray();

        let chart = charts.totalLines;
        if (chart) {
            chart.data.labels = employeeNames;
            chart.data.datasets[0].data = lines;
            chart.update();
            return;
        }

        let ctx = document.getElementById("chart-total-lines").getContext('2d');
        chart = new Chart(ctx, {
            type: 'horizontalBar',
            data: {
                labels: employeeNames,
                datasets: [{
                    label: 'Lines Cleared',
                    data: lines,
                    backgroundColor: 'rgba(102, 255, 153, 0.2)',
                    borderColor: 'rgba(51, 204, 51, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                scales: {
                    xAxes: [{
                        ticks: {
                            beginAtZero: true
                        }
                    }]
                }
            }
        });
        charts.totalLines = chart;
    }

})();