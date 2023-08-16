(function () {
    'option strict'

    //for access outside of this closure
    window.apc.supervisor = {};

    //for showing Free Text modal window
    window.apc.supervisor.showFreeTextPreview = showFreeTextPreview;

    var $showRecordsLink = $("#show-records-link");
    var $showCallsLink = $("#show-calls-link");

    var $recordsGrid = $("#records-grid");
    $recordsGrid.isInitialized = false;

    var $callsGrid = $("#calls-grid");
    $callsGrid.isInitialized = false;

    $showRecordsLink.click(() => showRecordsGrid());
    $showCallsLink.click(() => showCallsGrid());

        //setupDateFilterWidgets
    var $startDatePicker = $("#start-date").kendoDatePicker({ value: new Date() });
    var $endDatePicker = $("#end-date").kendoDatePicker({ value: new Date() });

    $("#btn-apply-filter").click(() => {

        let startDate = $startDatePicker.data("kendoDatePicker").value();
        let endDate = $endDatePicker.data("kendoDatePicker").value();

        loadRecordsGrid(startDate, endDate);
    });

    $("#btn-apply-filter-today").click(() => {
        let today = new Date();
        $startDatePicker.data("kendoDatePicker").value(today);
        $endDatePicker.data("kendoDatePicker").value(today);

        loadRecordsGrid(today, today);
    });

    initializeCdrGrid();

    loadRecordsGrid();

    function initializeCdrGrid() {
        $("#cdr-grid").kendoGrid({
            dataSource: {
                //data: await getCallRecords(userName),
                schema: {
                    model: {
                        fields: {
                            ID: { type: "number" },
                            CallDirection: { type: "string" },
                            Agent: { type: "string" },
                            OtherParty: { type: "string" },
                            TalkTimeSeconds: { type: "number" },
                            CallDate: { type: "date" },
                            CallStart: { type: "time" },
                            CallEnd: { type: "time" },
                            CallResult: { type: "string" },
                            HasAudioRecording: { type: "string" },
                        }
                    }
                }
            },
            height: 300,
            width: 1000,
            columns: [
                {
                    field: "ID",
                    title: "Call ID",
                    hidden: true
                },
                {
                    field: "Agent",
                    title: "Agent",
                    width: "130px",
                },
                {
                    field: "CallDirection",
                    title: "Call Type",
                    width: "80px",
                },
                {
                    field: "OtherParty",
                    title: "Phone #",
                    width: "100px",
                    template: function (dataItem) {
                        if (!dataItem.OtherParty) return "";
                        return formatPhoneNumber(dataItem.OtherParty);
                    },
                },
                {
                    field: "CallDate",
                    title: "Date",
                    width: "70px",
                    template: function (dataItem) {
                        if (!dataItem.CallDate) return "";
                        return moment(dataItem.CallDate).format('M/D/YY');
                    },
                },
                {
                    field: "CallStart",
                    title: "Started",
                    width: "90px",
                    template: function (dataItem) {
                        if (!dataItem.CallStart) return "";
                        return formatTime(dataItem.CallStart);
                    },
                },
                {
                    field: "CallEnd",
                    title: "Ended",
                    width: "90px",
                    template: function (dataItem) {
                        if (!dataItem.CallEnd) return "";
                        return formatTime(dataItem.CallEnd);
                    },
                },
                {
                    field: "TalkTimeSeconds",
                    title: "Time Secs",
                    width: "70px",
                },
                {
                    field: "HasAudioRecording",
                    title: "Call Recording",
                    template: function (dataItem) {
                        if (!dataItem.HasAudioRecording) return "No Recording Available";
                        return `<audio type="audio/mp3"
                                   preload="none"
                                   controls
                                   src="./CallTracker/GetAudioFile?cdrid=${dataItem.ID}">
                                </audio>`;
                    },
                }
            ]
        });
    }

    async function showCdrGridModal(phoneNumber, startDate, endDate) {

        if (!startDate)
            startDate = $startDatePicker.data("kendoDatePicker").value();

        if (!endDate)
            endDate = $endDatePicker.data("kendoDatePicker").value();

        startDate = moment(startDate).format('YYYY-MM-DD');
        endDate = moment(endDate).format('YYYY-MM-DD');

        let url = `./CallTracker/GetCDRByDate?phoneNumber=${phoneNumber}&startDate=${startDate}&endDate=${endDate}`;
        
        let data = await (await fetch(url)).json();
        $("#cdr-grid").data("kendoGrid").dataSource.data(data);

        let title = `${data.length} call record`;
        if (data.length > 1) title += 's';
        title += ` found Today To/From ${formatPhoneNumber(phoneNumber)}`;

        $("#cdr-grid-title").text(`${title}`);

        let $modal = $("#cdr-grid-modal");

        //make sre audio stops playing when the modal closes
        $modal.on("hidden.bs.modal", (e) => {
            $.each($("audio"), function () {
                this.pause();
                this.currentTime = 0;
            });
        })

        $modal.modal();
    }

    //bind loadCdrGrid to window for use outside of this closure
    window.apc.showCdrGridModal = showCdrGridModal;

    async function loadRecords(startDate, endDate) {

        if (!startDate) startDate = new Date();
        if (!endDate) startDate = new Date();

        startDate = moment(startDate).format('YYYY-MM-DD');
        endDate = moment(endDate).format('YYYY-MM-DD');
        return await (await fetch(`./CallTracker/GetCallLogs?startDate=${startDate}&endDate=${endDate}`)).json();
    }

    async function loadRecordsGrid(startDate, endDate) {

        var data = await loadRecords(startDate, endDate);
        var logs = data.logs;
        var attendants = data.attendants;

        window.apc.supervisor.attendants = attendants;

        let gridData = $recordsGrid.data("kendoGrid");

        if (gridData) {
            gridData.dataSource.data(logs);
            gridData.options.detailInit = loadAttendantDetails;
            return;
        }

        $recordsGrid.kendoGrid({
            dataSource: {
                data: logs,
                schema: {
                    model: {
                        fields: {
                            ID: { type: "number" },
                            CallDate: { type: "date" },
                            CallTime: { type: "time" },
                            CallType: { type: "string" },
                            PhoneNumber: { type: "string" },
                            Branch: { type: "string" },
                            ClientID: { type: "number" },
                            ClientName: { type: "string" },
                            Medicaid: { type: "string" },
                            EvvClientId: { type: "number" },
                            UserName: { type: "string" }
                        }
                    }
                }
            },
            toolbar: ["excel"],
            detailInit: loadAttendantDetails,
            height: 900,
            filterable: {
                mode: "row"
            },
            pageable: {
                pageSize: 400
            },
            groupable: true,
            sortable: true,
            columns: [
                {
                    field: "ID",
                    title: "Call ID",
                    filterable: false,
                    hidden: true
                },
                {
                    field: "UserName",
                    title: "Agent",
                    width: "180px",
                },
                {
                    field: "Branch",
                    width: "120px",
                },
                {
                    field: "CallDate",
                    title: "Date",
                    width: "90px",
                    filterable: false,
                    template: function (dataItem) {
                        if (!dataItem.CallDate) return "";
                        return moment(dataItem.CallDate).format('MM-DD-YYYY');
                    },
                    groupHeaderTemplate: function (e) {
                        if (!e.value) return "";
                        return moment(e.value).format('MM-DD-YYYY');
                    },
                },
                {
                    field: "CallTime",
                    title: "Time",
                    width: "90px",
                    filterable: false,
                    template: function (dataItem) {
                        if (!dataItem.CallTime) return "";
                        return formatTime(dataItem.CallTime);
                    },
                },
                {
                    field: "CallType",
                    title: "Type",
                    width: "80px",
                    filterable: false,
                },
                {
                    field: "PhoneNumber",
                    title: "Phone #",
                    width: "200px",
                    template: function (dataItem) {
                        if (!dataItem.PhoneNumber) return "";
                        return formatPhoneNumber(dataItem.PhoneNumber);
                    },
                },
                {
                    field: "ClientID",
                    hidden: true,
                },
                {
                    field: "ClientName",
                    title: "Client",
                    width: "200px",
                },
                {
                    field: "CallCount",
                    title: "Calls",
                    width: "50px",
                    filterable: false,
                    template: function (dataItem) {
                        if (!dataItem.CallCount) return "";
                        return `<a class="cdr-calls-link" onclick='window.apc.showCdrGridModal("${dataItem.PhoneNumber}")'>( ${dataItem.CallCount} )</a>`;
                    },
                },
                {
                    field: "Medicaid",
                    hidden: true,
                },
                {
                    field: "EvvClientID",
                    hidden: true,
                },
            ]
        });

        $recordsGrid.isInitialized = true;

        //master-detail... loads attendant detail sub-grid
        function loadAttendantDetails(e) {

            $("<div/>").appendTo(e.detailCell).kendoGrid({
                dataSource: {
                    data: window.apc.supervisor.attendants,
                    filter: { field: "CallID", operator: "eq", value: e.data.ID },
                    schema: {
                        model: {
                            fields: {
                                ID: { type: "number" },
                                CallID: { type: "number" },
                                Branch: { type: "string" },
                                AttendantID: { type: "number" },
                                AttendantName: { type: "string" },
                                VerifiedClient: { type: "boolean" },
                                VerifiedAttendant: { type: "boolean" },
                                LeftMessage: { type: "boolean" },
                                Needs2067Form: { type: "boolean" },
                                NumberOfLinesCleared: { type: "number" },
                                TokenNotes: { type: "string" },
                                CodeID: { type: "string" },
                                CodeName: { type: "string" },
                                FreeText: { type: "string" },
                            }
                        }
                    }
                },
                columns: [
                    {
                        field: "CallID",
                        title: "Call ID",
                        hidden: true
                    },
                    {
                        field: "Branch",
                        hidden: true
                    },
                    {
                        field: "AttendantID",
                        hidden: true
                    },
                    {
                        field: "AttendantName",
                        title: "Attendant",
                        width: "300px",
                    },
                    {
                        field: "VerifiedClient",
                        title: "Client",
                        width: "90px",
                        template: function (dataItem) {
                            if (dataItem.VerifiedClient !== true) return "";
                            return "<i class='fa fa-check text-success'></i>";
                        },
                        headerAttributes: {
                            style: "text-align: center;"
                        },
                        attributes: {
                            style: "text-align: center;"
                        }
                    },
                    {
                        field: "VerifiedAttendant",
                        title: "Attendant",
                        width: "90px",
                        template: function (dataItem) {
                            if (dataItem.VerifiedAttendant !== true) return "";
                            return "<i class='fa fa-check text-success'></i>";
                        },
                        headerAttributes: {
                            style: "text-align: center;"
                        },
                        attributes: {
                            style: "text-align: center;"
                        }
                    },
                    {
                        field: "LeftMessage",
                        title: "Left Msg",
                        width: "90px",
                        template: function (dataItem) {
                            if (dataItem.LeftMessage !== true) return "";
                            return "<i class='fa fa-check text-success'></i>";
                        },
                        headerAttributes: {
                            style: "text-align: center;"
                        },
                        attributes: {
                            style: "text-align: center;"
                        }
                    },
                    {
                        field: "Needs2067Form",
                        title: "2067",
                        width: "90px",
                        template: function (dataItem) {
                            if (dataItem.Needs2067Form !== true) return "";
                            return "<i class='fa fa-check text-success'></i>";
                        },
                        headerAttributes: {
                            style: "text-align: center;"
                        },
                        attributes: {
                            style: "text-align: center;"
                        }
                    },
                    {
                        field: "NumberOfLinesCleared",
                        title: "Lines",
                        width: "75px",
                        headerAttributes: {
                            style: "text-align: center;"
                        },
                        attributes: {
                            style: "text-align: center;"
                        }
                    },
                    {
                        field: "TokenNotes",
                        title: "Token",
                        hidden: true
                    },
                    {
                        field: "CodeID",
                        title: "Code",
                        hidden: true
                    },
                    {
                        field: "CodeName",
                        title: "Code Name",
                        hidden: true
                    },
                    {
                        field: "FreeText",
                        title: "Free Text",
                        template: function (dataItem) {
                            if (!dataItem.FreeText) return "";
                            let previewText = `${dataItem.FreeText.substring(0, 29)}...`;
                            cacheFreeTextForPreview(dataItem.ID, dataItem.FreeText);
                            return `<a class="free-text-preview-link" onclick='window.apc.supervisor.showFreeTextPreview("${dataItem.ID}")'>${previewText}</a>`;
                        },
                    },
                ]
            });
        }
    }

    function cacheFreeTextForPreview(id, text) {
        cache.set(`supervisor:freeText_${id}`, text);
    }

    function showFreeTextPreview(id) {
        let text = cache.get(`supervisor:freeText_${id}`);
        $("#free-text-preview").val(text);
        $("#free-text-preview-modal").modal();
    }

})();