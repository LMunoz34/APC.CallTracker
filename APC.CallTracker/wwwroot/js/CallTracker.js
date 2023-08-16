'use strict';

//var viewModel;

class AttendantLog {
    constructor(id) {
        this.logId = id;
        this.attendant = {};
        this.verifiedClient = false;
        this.verifiedAttendant = false;
        this.leftMessage = false;
        this.needs2067Form = false;
        this.linesCleared = 0;
        this.tokenNotes = "";
        this.code = "";
        this.freeTextHtml = "";
        this.freeText = "";
    }
}

class CallRecord {
    constructor(userName) {
        this.callType = "New Call";
        this.phoneNumber = "";
        this.client = {};
        this.attendantLogs = [];
        this.callDate = moment(new Date()).format('YYYY-MM-DD HH:mm:ss');
        this.userName = userName;
        this.emailRecipients = [];
    }
}

var currentRecord = new CallRecord(userName);

//onready
$(() => {

    if (devMode || devMode) {
        cache.clear();
        console.log("cache.clear() for devMode");
    }

    //add initial Attendant row
    addAttendantRow();

    setupAutoCompleteClients(onClientSelected);

    setupEmailLists(onEmailBranchSelected);

    loadCallLogsGrid();

    initializeCdrGrid();

    var $phoneNumberControl = $("#phone-number");
    $phoneNumberControl.kendoMaskedTextBox({ mask: "(999) 000-0000" });

    //bind controls
    $("#add-attendant-btn").click(() => addAttendantRow());

    $('[data-toggle="tooltip"]').tooltip({ container: 'body' });

    let $callTypeSelect = $("#call-type");

    $callTypeSelect.change(() => {
        currentRecord.callType = $callTypeSelect.val();
        updateCallTypeView(currentRecord.callType);
    });

    if (window.apc.isBillingOnlyUser) {
        const noCall = "No Call";
        $callTypeSelect.val(noCall);
        currentRecord.callType = noCall;
        updateCallTypeView(noCall);
    }
    else {
        const newCall = "New Call";
        $callTypeSelect.val(newCall);
        currentRecord.callType = newCall;
        updateCallTypeView(newCall);
    }


    function updateCallTypeView(callType) {
        let $phone = $("#phone-number");
        if (callType === "No Call") {
            $phone.attr("disabled", "true");
            $phone.val(null);
            currentRecord.phoneNumber = null;
        }
        else {
            $phone.removeAttr("disabled");
        }
    }

    $phoneNumberControl
        .data("kendoMaskedTextBox")
        .bind("change", function () {
            currentRecord.phoneNumber = this.raw();
        });

    function onClientSelected(e) {
        let client = this.dataItem();
        if (!client) return;
        currentRecord.client = { branch: client.branch, clientNumber: client.clientNumber, clientName: client.fullName, zip: client.zip };
        $("#client-search").val(client.fullName);
        //let $branches = $("#email-to");
        //$branches.val(client.branch);
        //$branches.trigger("change");
    }

    async function onEmailBranchSelected(e) {
        let $branches = $("#email-to");
        let $recipients = $("#email-recipients");
        let branchCode = $branches.val();
        let emails = await getEmailsForBranch(branchCode);

        let multiselect = $recipients.data("kendoMultiSelect");
        multiselect.setDataSource(emails);

        let selectedEmails = Enumerable.from(emails).where(e => e.branchCode === branchCode).select(b => b.emailAddress).toArray();
        multiselect.value(selectedEmails);

        currentRecord.emailRecipients = selectedEmails;
    }

    async function getEmailsForBranch(branchCode) {
        let emails = await getEmailRecipients();

        //filter by branch code
        if (branchCode)
            emails = Enumerable.from(emails).where(e => e.branchCode === branchCode).toArray();

        return emails;
    }


    $("#record-save-btn").click(() => {
        saveCurrentRecord();
    });

    $("#record-clear-btn").click(() => {
        clearCurrentRecord(true);
    });

    $("#refresh-logs-btn").click(() => {
        refreshCallLogsGrid();
    });

    //setup toastr stuff
    toastr.options.showMethod = 'slideDown';
    toastr.options.hideMethod = 'slideUp';
    toastr.options.closeMethod = 'slideUp';
    toastr.options.preventDuplicates = true;
    toastr.options.preventOpenDuplicates = true;

});

function refreshCallLogsGrid() {
    var $button = $("#refresh-logs-btn");

    $button.addClass("fa-spin");
    $button.attr("disabled", "disabled");
    $button.attr("data-original-title", "Synchronizing Logs");
    $button.tooltip("hide");

    loadCallLogsGrid().then(() => {
        $button.removeClass("fa-spin");
        $button.removeAttr("disabled");
        $button.attr("data-original-title", "Sync Activity Logs");
        $("#logs-grid").data("kendoGrid").refresh();
    });
}

async function loadCdrGrid(phoneNumber) {
    let user = userName;
    let url = `./CallTracker/GetCDRByDate?userNames=${user}&phoneNumber=${phoneNumber}`;

    if (devMode) {
        user = "elisa.elizondo";
        //url = `./CallTracker/GetCDRByDate?userNames=${user}&phoneNumber=${phoneNumber}&startDate=2018-03-20&endDate=2018-03-20`
    }

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

function initializeCdrGrid() {
    $("#cdr-grid").kendoGrid({
        dataSource: {
            //data: await getCallRecords(userName),
            schema: {
                model: {
                    fields: {
                        ID: { type: "number" },
                        CallDirection: { type: "string" },
                        OtherParty: { type: "string" },
                        TalkTimeSeconds: { type: "number" },
                        CallStart: { type: "time" },
                        CallEnd: { type: "time" },
                        CallResult: { type: "string" },
                        HasAudioRecording: { type: "string" },
                    }
                }
            }
        },
        height: 300,
        width: 800,
        columns: [
            {
                field: "ID",
                title: "Call ID",
                hidden: true
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

async function loadCallLogsGrid() {

    let $grid = $("#logs-grid");
    let data = await loadCallLogs();
    let logs = data.logs;
    let attendants = data.attendants;

    //$grid.data("kendoGrid").options.detailInit = loadAttendantDetails;

    $("#activity-log-header").text(`Activity Log - Today ( ${logs.length} records )`);

    let gridData = $grid.data("kendoGrid");
    if (gridData) {
        gridData.dataSource.data(logs);
        gridData.options.detailInit = loadAttendantDetails;
        return;
    }

    $grid.kendoGrid({
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
        detailInit: loadAttendantDetails,
        height: 900,
        filterable: {
            mode: "row"
        },
        sortable: true,
        columns: [
            {
                field: "ID",
                title: "Call ID",
                filterable: false,
                hidden: true
            },
            {
                field: "CallDate",
                title: "Date",
                filterable: false,
                hidden: true
            },
            {
                field: "CallTime",
                title: "Time",
                width: "120px",
                filterable: false,
                template: function (dataItem) {
                    if (!dataItem.CallTime) return "";
                    return formatTime(dataItem.CallTime);
                },
            },
            {
                field: "CallType",
                title: "Type",
                width: "100px",
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
                field: "Branch",
                hidden: true,
            },
            {
                field: "ClientID",
                hidden: true,
            },
            {
                field: "ClientName",
                title: "Client"
            },
            {
                field: "CallCount",
                title: "Calls",
                width: "50px",
                filterable: false,
                template: function (dataItem) {
                    if (!dataItem.CallCount) return "";
                    return `<a class="cdr-calls-link" onclick='loadCdrGrid("${dataItem.PhoneNumber}")'>( ${dataItem.CallCount} )</a>`;
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
            {
                field: "UserName",
                hidden: true,
            },
        ]
    });

    function loadAttendantDetails(e) {
        console.log("loadAttendantDetails");
        $("<div/>").appendTo(e.detailCell).kendoGrid({
            dataSource: {
                data: attendants,
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
                        return `<a class="free-text-preview-link" onclick='showFreeTextPreview("${dataItem.ID}")'>${previewText}</a>`;
                    },
                },
            ]
        });

        
    }
}

function cacheFreeTextForPreview(id, text) {
    cache.set(`freeText_${id}`, text);
}

function showFreeTextPreview(id) {
    let text = cache.get(`freeText_${id}`);
    $("#free-text-preview").val(text);
    $("#free-text-preview-modal").modal();
}

async function loadCallLogs() {

    if (devMode) {
       //console.log("devMode loadCallLogs");
       //return await (await fetch(`./CallTracker/GetCallLogs?startDate=2018-03-20&endDate=2018-03-20`)).json();
       userName = "elisa.elizondo";
    }

    return await (await fetch(`./CallTracker/GetCallLogs?userNames=${userName}`)).json();
}

async function saveCurrentRecord() {

    let errors = validateCallRecord();

    if (errors.length > 0) {
        showValidationAlert(errors);
        return;
    }

    let json = JSON.stringify(currentRecord);

    let $loader = $(".loader");
    $loader.show();

    swal({
        title: 'Saving Record...',
        timer: 3000,
        content: $loader[0],
        buttons: false
    }).then(() => $loader.hide());

    let result = await (await fetch("./CallTracker/SaveRecord", { method: "post", body: json })).json();
    toastr.success("Record Saved!");
    clearCurrentRecord(false);
    refreshCallLogsGrid();
    if (window.apc.appRefreshRequired) {
        location.reload();
    }
}

function showValidationAlert(errors) {

    if (!errors || errors.length === 0) return;

    //validation-messages
    let $validationDiv = $("#validation-messages");
    let $validationList = $("#validation-messages ul");
    
    if ($validationDiv.length === 0) {
        //for some reason sweetAert removes the content DIV, not sure why
        //this detects and rebuilds the markup that shows the UL list errors
        let div = `<div id="validation-messages" style="color: red; display: none;">
                       <ul style="text-align: left; margin-left: 80px;"></ul>
                   </div>`;
        $validationDiv = $(div);
        $validationList = $(div).find('ul');
        $(".body-container").append($validationDiv);

        //give it 100 ms and then recurse back into this method to display any errors
        setTimeout(()=>showValidationAlert(errors), 100);
        return;
    }
    else {
        console.log("validation div NOT empty");
    }

    $validationList.empty();

    for (var error of errors) {
        $validationList.append(`<li>${error}</li>`);
    }

    $validationDiv.show();

    let message = "Please fix this issue and try again:";
    if (errors.length > 1) message = "Please fix these issues and try again:";

    //validation-messages
    swal("Write something here:", {
        title: "Invalid record!",
        icon: "warning",
        text: message,
        content: $validationDiv[0]
    })
    .then(() => {
        $validationDiv.hide();
    });
}

function validateCallRecord() {
    let errors = [];

    let phoneNumber = $("#phone-number").data("kendoMaskedTextBox").raw();

    let callType = $("#call-type").val();

    if (callType === "New Call") {
        if (!phoneNumber)
            errors.push("Phone number is required");
        else if (phoneNumber.length !== 10)
            errors.push("Phone number should be 10 numbers");
    }


    if (!$("#client-search").data("kendoAutoComplete").value())
        errors.push("No Client has been selected");

    let hasAttendantError = false;
    let hasReasonCodeError = false;

    if (currentRecord.attendantLogs.length === 0)
        errors.push("No Attendants have been selected");
    else {
        for (let log of currentRecord.attendantLogs) {
            if (!log.attendant.providerNumber) {
                hasAttendantError = true;
                showAttendantRowError(log.logId);
            }
            else {
                if (!log.leftMessage && !log.code) {
                    showAttendantRowError(log.logId);
                    hasReasonCodeError = true;
                }
                else {
                    clearAttendantRowError(log.logId);
                }
            }
        }
    }

    if (hasAttendantError)
        errors.push("Missing Attendant(s)");

    if (hasReasonCodeError)
        errors.push("Attendants must have a reason code selected");

    function showAttendantRowError(logId) {
        $(`div#attendant-row-${logId}`).addClass("invalid");
    }

    function clearAttendantRowError(logId) {
        $(`div#attendant-row-${logId}`).removeClass("invalid");
    }

    return errors;
}

function clearCurrentRecord(confirm) {

    if (!confirm) {
        performClear();
        return;
    }

    swal({
        title: "Clear everything and start over?",
        text: "Please confirm...",
        icon: "warning",
        buttons: ["Cancel", "Clear"]
    })
        .then((value) => {
            if (value) {
                performClear();
            }
        });

    function performClear() {
        $("#call-type").val("New Call");
        $("#call-type").trigger("change");
        $("#phone-number").data("kendoMaskedTextBox").value(null);
        $("#client-search").data("kendoAutoComplete").value(null);
        for (var row of currentRecord.attendantLogs) {
            deleteAttendantRow(row.logId, true);
        }

        $("#email-to").val(null);
        $("#email-recipients").data("kendoMultiSelect").value(null);

        //make sure any straggler attendant row DIVs are removed
        $("[id^=attendant-row]").remove();

        currentRecord = new CallRecord(userName);
        addAttendantRow();
        $("#phone-number").focus();
    }
}

var reasonCodeVM;

function addAttendantRow() {

    //grab template html
    let template = $("#attendant-template-row").html();

    //generate id suffix
    const id = randomId();
    const data = { id: id };

    //render unique ids on elements in template
    const html = Mustache.render(template, data);

    let newRow = $(html);
    $(".attendant-table").append(newRow);

    //apply tooltips as needed
    newRow.find("[data-toggle='tooltip']").tooltip();

    //animate new row snazziness
    newRow.addClass("animated fadeInUp");

    //apply numeric controls
    $("#LinesCleared-" + id).kendoNumericTextBox({
        format: "#",
        decimals: 0
    });

    var attendantLog = new AttendantLog(id);

    currentRecord.attendantLogs.push(attendantLog);

    //apply autoComplete on Attendants
    setupAutoCompleteAttendants(id, onAttendantChanged);

    //setup bindings
    $(`#VerifiedClient-${id}`).change(function () {
        attendantLog.verifiedClient = $(this).is(":checked");
    });

    $(`#VerifiedAttendant-${id}`).change(function () {
        attendantLog.verifiedAttendant = $(this).is(":checked");
    });

    $(`#LeftMessage-${id}`).change(function () {
        attendantLog.leftMessage = $(this).is(":checked");
    });

    $(`#Needs2067Form-${id}`).change(function () {
        attendantLog.needs2067Form = $(this).is(":checked");
    });

    $(`#LinesCleared-${id}`).change(function () {
        attendantLog.linesCleared = this.value;
    });

    $(`#LinesCleared-${id}`).data("kendoNumericTextBox").bind("spin", function () {
        attendantLog.linesCleared = this.value();
    });

    $(`#token-notes-${id}`).change(function () {
        attendantLog.tokenNotes = this.value;
    });

    $(`#edit-note-btn-${id}`).click(function () {
        console.log(`Opening Reason Code Editor for attendantLog: ${id}`);
        showReasonCodeEditor(attendantLog);
    });

    function onAttendantChanged() {
        let attendant = this.dataItem();
        if (!attendant || !attendantLog.attendant) return;
        attendantLog.attendant = { branch: attendant.branch, providerNumber: attendant.providerNumber, providerName: attendant.fullName };
        this.element.val(attendant.fullName);
    }
}

function deleteAttendantRow(rowId, noConfirmation) {

    if (noConfirmation) {
        performDelete();
        return;
    }

    $("#delete-attendant-btn").click({ rowId: rowId }, (e) => {
        performDelete(e);
    });

    function performDelete(e) {
        //hide the delete dialog
        $("#delete-attendant-modal").modal("hide");

        //remove click handler on delete row
        if (e) $(e.currentTarget).off();

        //dispose tooltip on delete row button
        $("#delete-row-btn-" + rowId).tooltip("dispose");

        //remove change handlers from controls on the attendant div row
        $(`[id$=${rowId}]`).off();

        //delete the actual div row
        let $row = $("#attendant-row-" + rowId);
        $row.addClass("animated zoomOut");
        setTimeout(() => $row.remove(), 350);

        for (let i = 0; i < currentRecord.attendantLogs.length; i++) {
            let log = currentRecord.attendantLogs[i];
            if (log.logId === rowId) {
                currentRecord.attendantLogs.splice(i, 1);
                break;
            }
        }
    }

    //open delete dialog
    $("#delete-attendant-modal").modal();
}

function showReasonCodeEditor(attendantLog) {

    var editor = document.getElementById("reason-code-editor");

    var reasonCodeVM = ko.dataFor(editor);

    var $modal = $("#reason-code-modal");

    if (!reasonCodeVM) initializeModal();

    reasonCodeVM.code(attendantLog.code);
    reasonCodeVM.codeTemplate(attendantLog.freeTextHtml);

    $("#reason-code-modal-save-btn").on("click", () => saveReasonCode(attendantLog));
    $("#copy-free-text-btn").on("click", () => reasonCodeVM.copyFreeTextToClipboard("Copied!"));

    $modal.modal();

    //hide any Edit Note tooltips stuck open
    $("[id^=edit-note-btn]").tooltip("hide");


    function initializeModal() {
        reasonCodeVM = new ReasonCodeViewModel(userSignature);
        ko.applyBindings(reasonCodeVM, editor);
        reasonCodeVM.load();

        $modal.on("hidden.bs.modal", (e) => reasonCodeVM.resetModel());
    }

    function saveReasonCode(attendant) {
        let freeText = reasonCodeVM.getFreeText();
        if (freeText === "not valid") return;

        let freeTextHtml = reasonCodeVM.getFreeTextHtml();
        attendant.code = reasonCodeVM.code();
        attendant.freeText = freeText;
        attendant.freeTextHtml = freeTextHtml;
        reasonCodeVM.savedPreviously = true;

        $("#reason-code-modal-save-btn").off();
        $("#copy-free-text-btn").off();
        $modal.modal("hide");
    }

}

var ReasonCodeViewModel = function (userSignature) {

    var self = this;
    var cacheExpirationMins = 480;

    const selectACodeCaption = "Select a Code...";

    //properties
    self.code = ko.observable(selectACodeCaption).extend({ deferred: true });
    self.codeSummary = ko.observable();
    self.codeDescription = ko.observable();
    self.codeCaption = ko.observable();
    self.codeTemplate = ko.observable().extend({ deferred: true });
    self.savedPreviously = false;

    //lookups
    self.reasonCodes = ko.observableArray();
    self.elementLookupValues = ko.observableArray();
    self.emailRecipients = ko.observableArray();
    self.branches = ko.observableArray();

    //subscriptions
    self.code.subscribe((code) => {
        if (code === null || code === "")
            code = selectACodeCaption;

        var $modal = $("#reason-code-modal");

        if (($modal.data('bs.modal') || {})._isShown)
            loadCodeEditor(code);
    });

    //destroy any rendered kendo widgets after reason code template HTML is unbound
    var renderedKendoWidgets = [];
    self.codeTemplate.subscribe((html) => {
        for (let $widget of renderedKendoWidgets) {
            let kendoWidget = $($widget.element).data($widget.type);
            if (kendoWidget) kendoWidget.destroy();
        }
        //clear it out
        renderedKendoWidgets.length = 0;

        $("span.invalid-message.invalid").removeClass("invalid");
    });

    //methods
    self.showSummary = ko.computed(() => {
        return self.code() !== selectACodeCaption;
    }, self);

    self.showSelectCodeCallout = ko.computed(() => {
        return self.code() === selectACodeCaption;
    }, self);

    self.showCodeEditor = ko.computed(() => {
        return self.showSummary();
    }, self);

    self.resetModel = function () {
        self.code(selectACodeCaption);
    };

    self.getFreeText = function () {
        if (!validateFreeText()) return "not valid";
        return renderFreeText();
    }

    self.getFreeTextHtml = function () {
        if (!validateFreeText()) return "not valid";
        return renderFreeTextHtml();
    }

    self.copyFreeTextToClipboard = function (message) {
        if (!validateFreeText()) return;

        if (!message || typeof message !== "string")
            message = "Copied!";

        let freeText = renderFreeText();

        let $freeTextArea = $("#free-text-copy");
        $freeTextArea.val(freeText);

        let $freeTextCopyBtn = $("#copy-free-text-modal");

        $freeTextCopyBtn.on("click", () => performCopy());

        let $freeTextModal = $("#free-text-modal").modal();

        function performCopy() {
            $freeTextArea.select();
            try {
                var status = document.execCommand('copy');
                if (status) {
                    console.log("The text is now on the clipboard");
                }
                else {
                    console.error("Cannot copy text");
                }
            }
            catch (err) {
                console.log('Unable to copy.');
            }
            toastr.success("Copied!");
            $freeTextCopyBtn.off();
            $freeTextModal.modal("hide");
        }

        return freeText;
    }

    //copy attributes from DOMParser node to jquery element
    function copyAttributes(node, $element, options) {
        $.each(node.attributes, function () {
            if (!$element.attr(this.name))
                $element.attr(this.name, this.value);
        });

        if (options === undefined) options = {};
        if (options.forDatabase) {

            //gather list of attributes to remove from final element
            let attrs = [];
            attrs.push("value");
            attrs.push("class");
            attrs.push("data-element");
            attrs.push("type");
            attrs.push("style");
            attrs.push("role");
            attrs.push("data-role");
            attrs.push("title");

            //get all aria.* attributes
            $.each($element[0].attributes, (index, attribute) => {
                if (attribute && attribute.name.startsWith("aria"))
                    attrs.push(attribute.name);
            });

            for (var attr of attrs) {
                $element.attr(attr, null);
            }
        }
    }

    function renderFreeTextHtml() {
        var htmlBuilder = [];

        htmlBuilder.push("<free-text>");
        $(".free-text")
            .find("span[data-element='text'], .code-editor-control")
            .each(function () {
                let el = this;
                if (el.tagName === "SPAN") {
                    htmlBuilder.push(el.innerText);
                    return;
                }
                let elementType = getCustomElementType(el);

                if (elementType === "service-selector" && el.tagName !== "SELECT") return;

                let html = renderElementForDatabase(elementType, el);
                //console.log(html);
                htmlBuilder.push(html);
            });

        htmlBuilder.push("</free-text>");

        return htmlBuilder.join("");
    }

    function renderElementForDatabase(elementType, node) {
        let value = "";
        if (!elementType)
            console.log("is null");

        switch (elementType.toUpperCase()) {
            case "DATE-PICKER":
                value = getElementValue_date_picker(node);
                break;

            case "TIME-PICKER":
                value = getElementValue_time_picker(node);
                break;

            case "MEMO":
                value = getElementValue_memo(node);
                break;

            case "DISASTER-SELECTOR":
                value = getElementValue_disaster_selector(node);
                break;

            case "EVV-EXCEPTION":
                value = getElementValue_evv_exception(node);
                break;

            case "VERIFIED-WITH":
                value = getElementValue_verified_with(node);
                break;

            case "GENERAL-NOTE-CLIENT":
                value = getElementValue_general_note_client(node);
                break;

            case "GENERAL-NOTE-ATTENDANT":
                value = getElementValue_general_note_attendant(node);
                break;

            case "SUSPEND-REASON":
                value = getElementValue_suspend_reason(node);
                break;

            case "SERVICE-SELECTOR":
                value = getElementValue_service_selector(node);
                break;

            case "TEXT-FIELD":
                value = getElementValue_text_field(node);
                break;

            case "NUMERIC-FIELD":
                value = getElementValue_numeric_field(node);
                break;

            case "IN-OUT-PICKER":
                value = getElementValue_in_out_picker(node);
                break;
        }

        let $element = $(`<${elementType}>${value}</${elementType}>`);

        copyAttributes(node, $element, { forDatabase: true });

        return $element[0].outerHTML;
    }

    function renderMemoHtml(node, htmlBuilder) {

        let value = getElementValue_memo(node) || "";
        let $element = $(`<memo>${value}</memo>`);

        copyAttributes(node, $element, { forDatabase: true });

        htmlBuilder.push($element[0].outerHTML);
    }

    function renderTextFieldHtml(node, htmlBuilder) {

        let value = getElementValue_text_field(node) || "";
        let $element = $(`<text-field>${value}</text-field>`);

        copyAttributes(node, $element, { forDatabase: true });

        htmlBuilder.push($element[0].outerHTML);
    }

    function renderNumericFieldHtml(node, htmlBuilder) {
        let value = getElementValue_text_field(node) || "";
        let $element = $(`<numeric-field>${value}</numeric-field>`);

        copyAttributes(node, $element, { forDatabase: true });

        htmlBuilder.push($element[0].outerHTML);
    }

    function renderInOutPickerHtml(node, htmlBuilder) {
        let value = getElementValue_text_field(node) || "";
        let $element = $(`<in-out-picker>${value}</in-out-picker>`);

        copyAttributes(node, $element, { forDatabase: true });

        htmlBuilder.push($element[0].outerHTML);
    }

    function renderServiceSelectorHtml(node, htmlBuilder) {
        let value = getElementValue_text_field(node) || "";
        let $element = $(`<service-selector>${value}</service-selector>`);

        copyAttributes(node, $element, { forDatabase: true });

        htmlBuilder.push($element[0].outerHTML);
    }

    function renderDisasterSelectorHtml(node, htmlBuilder) {
        let value = getElementValue_text_field(node) || "";
        let $element = $(`<disaster-selector>${value}</disaster-selector>`);

        copyAttributes(node, $element, { forDatabase: true });

        htmlBuilder.push($element[0].outerHTML);
    }

    function renderEvvExceptionHtml(node, htmlBuilder) {
        let value = getElementValue_text_field(node) || "";
        let $element = $(`<evv-exceptio>${value}</evv-exception>`);

        copyAttributes(node, $element, { forDatabase: true });

        htmlBuilder.push($element[0].outerHTML);
    }

    function renderVerifiedWithHtml(node, htmlBuilder) {
        let value = getElementValue_text_field(node) || "";
        let $element = $(`<verified-with>${value}</verified-with>`);

        copyAttributes(node, $element, { forDatabase: true });

        htmlBuilder.push($element[0].outerHTML);
    }

    function renderDatePickerHtml(node, htmlBuilder) {
        let value = getElementValue_text_field(node) || "";
        let $element = $(`<date-picker>${value}</date-picker>`);

        copyAttributes(node, $element, { forDatabase: true });

        htmlBuilder.push($element[0].outerHTML);
    }

    function renderTimePickerHtml(node, htmlBuilder) {
        let value = getElementValue_text_field(node) || "";
        let $element = $(`<time-picker>${value}</time-picker>`);

        copyAttributes(node, $element, { forDatabase: true });

        htmlBuilder.push($element[0].outerHTML);
    }

    function renderFreeText() {
        let isDisasterCode = false;
        let disasterType = "";

        var textBuilder = [];
        $(".free-text")
            .find("*")
            .each(function () {
                let el = this;
                if (el.nodeType === 3) {
                    textBuilder.push(el.textContent);
                    return;
                }

                if (el.dataset.element === "text") {
                    textBuilder.push(el.innerText);
                    return;
                }

                if (el.nodeName === "TEXTAREA") {
                    textBuilder.push(el.value);
                    return;
                }

                if (el.dataset.element !== "custom") return;

                if (el.classList.contains("date-picker"))
                    textBuilder.push(getElementValue_date_picker(el, { friendlyFormat: true }).trim());

                else if (el.classList.contains("disaster-selector")) {
                    isDisasterCode = true;
                    disasterType = getElementValue_disaster_selector(el).trim();
                    textBuilder.push(disasterType);
                }                    

                else if (el.classList.contains("evv-exception"))
                    textBuilder.push(getElementValue_evv_exception(el).trim());

                else if (el.classList.contains("in-out-picker"))
                    textBuilder.push(getElementValue_in_out_picker(el).trim());

                else if (el.classList.contains("numeric-field"))
                    textBuilder.push(getElementValue_numeric_field(el).trim());

                else if (el.classList.contains("suspend-reason"))
                    textBuilder.push(getElementValue_suspend_reason(el).trim());

                else if (el.classList.contains("service-selector"))
                    textBuilder.push(getElementValue_service_selector(el).trim());

                else if (el.classList.contains("general-note-client"))
                    textBuilder.push(getElementValue_general_note_client(el).trim());

                else if (el.classList.contains("general-note-attendant"))
                    textBuilder.push(getElementValue_general_note_attendant(el).trim());

                else if (el.classList.contains("text-field"))
                    textBuilder.push(getElementValue_text_field(el).trim());

                else if (el.classList.contains("time-picker"))
                    textBuilder.push(getElementValue_time_picker(el, { friendlyFormat: true }).trim());

                else if (el.classList.contains("verified-with"))
                    textBuilder.push(getElementValue_verified_with(el).trim());

                else if (el.classList.contains("code-editor-control"))
                    throw `Unrecognized code-editor-control '${el.tagName}'`;

            });

        if (textBuilder.length === 0) return "";

        let caption = $("div.code-caption span").text();
        caption = `${caption}.`;
        caption = caption.replace("..", ".");

        if (isDisasterCode) {
            const letterCode = getDisasterTypeLetterCode(disasterType);
            caption = caption.replace("Code 130:", `Code 130${letterCode}:`)
        }

        let freeText = textBuilder.join(" ");
        freeText = freeText.replace("  ", " ");
        freeText = freeText.replace(" .", ".");

        let now = moment().format("M/DD/YYYY");
        freeText = `${caption} ${freeText} ${userSignature} ${now}`;

        return freeText;
    }

    function getDisasterTypeLetterCode(disaster) {
        disaster = disaster.toLowerCase();
        switch(disaster) {
            case "flood":
                return "A";
            case "hurricane":
                return "B";
            case "ice storm / snow storm":
                return "C";
            case "tornado":
                return "D";
            case "wildfire":
                return "E";
            default:
                return "";
        }

    }


    function getCustomElementType(el) {
        if (el.nodeType === 3) return null;

        //if (el.dataset.element !== "custom") return null;

        if (el.classList.contains("date-picker")) return "date-picker";

        else if (el.classList.contains("disaster-selector")) return "disaster-selector";

        else if (el.classList.contains("in-out-picker")) return "in-out-picker";

        else if (el.classList.contains("numeric-field")) return "numeric-field";

        else if (el.classList.contains("service-selector")) return "service-selector";

        else if (el.classList.contains("evv-exception")) return "evv-exception";

        else if (el.classList.contains("text-field")) return "text-field";

        else if (el.classList.contains("time-picker")) return "time-picker";

        else if (el.classList.contains("verified-with")) return "verified-with";

        else if (el.classList.contains("suspend-reason")) return "suspend-reason";

        else if (el.classList.contains("general-note-client")) return "general-note-client";

        else if (el.classList.contains("general-note-attendant")) return "general-note-attendant";

        else if (el.classList.contains("memo")) return "memo";

        //found code-editor-control class but cannot find any recognized control class, should not happen, throw if does
        else if (el.classList.contains("code-editor-control"))
            throw `Unrecognized code-editor-control '${el.tagName}'`;
    }


    function getElementValue_disaster_selector(el) {
        return el.value;
    }

    function getElementValue_evv_exception(el) {
        return el.value;
    }

    function getElementValue_verified_with(el) {
        return el.value;
    }

    function getElementValue_suspend_reason(el) {
        return el.value;
    }

    function getElementValue_general_note_client(el) {
        return `${el.value}.`;
    }

    function getElementValue_general_note_attendant(el) {
        return `${el.value}.`;
    }

    function getElementValue_in_out_picker(el) {
        let $checkedInput = $(el).find("input:checked");

        if (!$checkedInput) return null;

        let value = $checkedInput.next("label").text().toLowerCase();

        if (value === "both") value = "in or out";

        return value;
    }

    function getElementValue_numeric_field(el) {
        return el.value;
    }

    function getElementValue_service_selector(el) {
        let comboBox = $(el).data("kendoComboBox");

        if (comboBox)
            return comboBox.value();

        return el.value;
    }

    function getElementValue_text_field(el) {
        return el.value;
    }

    function getElementValue_memo(el) {
        return el.value;
    }

    function getElementValue_time_picker(el, options) {

        let value = $(el).data("kendoTimePicker").value();

        if (options && options.friendlyFormat) return moment(value).format('LT');

        return moment(value).format();

    }

    function getElementValue_date_picker(el, options) {
        let value = $(el).data("kendoDatePicker").value();

        if (options && options.friendlyFormat) return moment(value).format('L');

        return moment(value).format();
    }

    //update summary text after code selected
    self.onCodeSelected = function (obj, event) {
        //get data-summary attr from selected option
        let summary = $(event.currentTarget).find(":selected").data("summary");
        self.codeSummary(summary);
    };

    //load view model via ajax calls
    self.load = async function () {
        self.reasonCodes(await self.loadReasonCodes());
        self.elementLookupValues(await self.loadElementLookupValues());
        self.code(selectACodeCaption);
    };

    //load reason codes via ajax
    self.loadReasonCodes = async function () {
        let codes = cache.get("codes");

        if (codes) return Promise.resolve(codes);

        const userGreeting = $(".user-greeting").text().trim().toLowerCase();

        let showNewCodes = userGreeting.includes("almaguer") || userGreeting.includes("palmer");

        codes = await (await fetch(`./CallTracker/GetReasonCodeTemplates?billingOnly=${window.apc.isBillingOnlyUser}&showNewCodes=${showNewCodes}`)).json();

        //add "select a code..." caption to top of the list
        codes.unshift({
            codeID: selectACodeCaption,
            name: selectACodeCaption,
            summary: "",
            description: "",
            caption: "",
            needs2067: false,
            linkTypeID: ""
        });

        cache.set("codes", codes, hoursToMilliseconds(8));

        return Promise.resolve(codes);
    };

    //load element lookup values via ajax
    self.loadElementLookupValues = async function () {
        let lookups = cache.get("lookups");

        if (lookups) console.log("Retrieved Lookups from cache");

        if (lookups) return Promise.resolve(lookups);

        lookups = await (await fetch("./CallTracker/GetElementLookupValues")).json();

        cache.on('del:lookups', async () => {
            let data = await (await fetch("./CallTracker/GetElementLookupValues")).json();
            cache.set("lookups", data, hoursToMilliseconds(8));
        });

        cache.set("lookups", lookups, hoursToMilliseconds(8));

        return Promise.resolve(lookups);
    };

    async function getReasonCode(codeId) {
        var codes = await self.loadReasonCodes();

        for (var code of codes) {
            if (code.codeID === codeId) return Promise.resolve(code);
        }

        throw `CodeID: '${codeId}' was not found.`;
    }

    function getLookupValuesForElement(tag) {
        var allLookups = cache.get("lookups");
        var lookups = Enumerable
            .from(allLookups)
            .where(l => l.tag === tag)
            .orderBy("$.sortOrder")
            .thenBy("$.name")
            .toArray();
        return lookups;
    }

    function validateFreeText() {
        let $elements = $(".free-text [data-element='custom']");
        if ($elements.length === 0) return true;
        let isValid = true;
        $.each($elements, (index, el) => {
            let elementType = getCustomElementType(el);
            if (!elementType) return;
            if (!customElementIsValid(el, elementType)) {
                isValid = false;
                $(el).closest("span.control-container").addClass("invalid");
            }
            else {
                $(el).closest("span.control-container").removeClass("invalid");
            }

        });

        if (isValid)
            $("span.invalid-message").removeClass("invalid");
        else
            $("span.invalid-message").addClass("invalid");

        return isValid;
    }

    function customElementIsValid(el, elementType) {
        switch (elementType) {

            case "text-field":
            case "disaster-selector":
            case "verified-with":
                if (!el.value) return false;
                return true;

            case "numeric-field":
                if (!el.value || !$.isNumeric(el.value)) return false;
                return true;

            case "date-picker":
                if (!$(el).data("kendoDatePicker").value()) return false;
                return true;

            case "time-picker":
                if (!$(el).data("kendoTimePicker").value()) return false;
                return true;

            case "in-out-picker":
                if ($(el).find("input:checked").length === 0) return false;
                return true;

            case "service-selector":
                if (!$(el).data("kendoComboBox").value()) return false;
                return true;

            default:
                return true;
        }
    }

    //load corresponding html needed for each code template
    async function loadCodeEditor(codeId) {
        if (codeId === undefined || codeId === selectACodeCaption) {
            self.codeTemplate("");
            return;
        }

        let code = await getReasonCode(codeId);

        self.codeSummary(code.summary);
        self.codeDescription(code.description);
        self.codeCaption(code.caption);

        let renderedTemplate = {};

        if (self.savedPreviously && self.codeTemplate().startsWith("<free-text")) {
            renderedTemplate = renderCodeTemplate(code, self.codeTemplate());
        }
        else {
            renderedTemplate = renderCodeTemplate(code);
        }

        self.codeTemplate(renderedTemplate.html);

        //wait for html binding to complete then setup custom template controls
        setTimeout(() => {

            configureCustomWidgets();

            //after rendering everything, finally show it
            $(".free-text").show();

        }, 100);

        function configureCustomWidgets() {

            function registerWidget(widgetType, $widgets) {
                $.each($widgets, (key, el) => renderedKendoWidgets.push({ type: widgetType, element: el }));
            }

            //******************TIME-PICKER*************************//
            if (renderedTemplate.htmlBuilder.hasElementType("time-picker")) {
                let $elements = $("input.time-picker");

                $elements.kendoTimePicker({ interval: 1, min: "6:00 AM", max: "5:59 AM" });

                //set the time value if exists
                $.each($elements, function () {
                    let value = this.dataset.value;
                    if (!value) return;
                    if (!moment(value).isValid()) return;

                    let $timePicker = $(this).data("kendoTimePicker");
                    let time = moment(value).format("LT");
                    $timePicker.value(time);

                });

                registerWidget("kendoTimePicker", $elements);
            }

            //******************DATE-PICKER*************************//
            if (renderedTemplate.htmlBuilder.hasElementType("date-picker")) {
                let $elements = $("input.date-picker");
                $elements.kendoDatePicker();

                //set the date value if exists
                $.each($elements, function () {
                    let value = this.dataset.value;
                    if (!value) return;
                    if (!moment(value).isValid()) return;

                    let $datePicker = $(this).data("kendoDatePicker");
                    let date = moment(value).format("L");
                    $datePicker.value(date);
                });

                registerWidget("kendoDatePicker", $elements);
            }

            //******************SERVICE-SELECTOR*************************//
            if (renderedTemplate.htmlBuilder.hasElementType("service-selector")) {
                let $element = $(".service-selector");
                $element.kendoComboBox();
                registerWidget("kendoComboBox", $element);
            }

        }
    }


    function renderCodeTemplate(code, html) {

        var parser = new DOMParser();
        if (!html) html = code.template;

        var doc = parser.parseFromString(html, "text/html");

        //render elements into htmlBuilder
        var htmlBuilder = [];

        //setup some helper functions/properties for use up-stream
        htmlBuilder.elementTypes = [];

        //used downstream to record whether or not the rendered template contains an element of 'type'
        htmlBuilder.recordElementType = function (type) {
            this.elementTypes.push(type);
        }

        //used to determine if rendered template contains and element of 'type'
        htmlBuilder.hasElementType = function (type) {
            return this.elementTypes.indexOf(type) > -1;
        };

        for (var el of doc.body.childNodes) {

            if (el.tagName === "FREE-TEXT") {
                //only render <free-text> tag. Anything else render as-is
                htmlBuilder.push(renderFreeTextElement(el, htmlBuilder));
            }
            else {
                htmlBuilder.push(`<span data-element="text">${el.outerHTML}</span>`);
            }
        }

        var renderedTemplate = {};
        //join the rendered elements into a single html string
        renderedTemplate.html = htmlBuilder.join("");
        renderedTemplate.htmlBuilder = htmlBuilder;

        return renderedTemplate;
    }

    function renderFreeTextElement(node, htmlBuilder) {
        const textNodeType = 3;

        htmlBuilder.push('<div class="free-text" style="display: none">');

        for (var el of node.childNodes) {
            if (el.nodeType === textNodeType) {
                htmlBuilder.push(`<span data-element="text">${el.textContent}</span>`);
                continue;
            }
            switch (el.tagName) {
                case "DATE-PICKER":
                    renderDatePickerElement(el, htmlBuilder);
                    break;

                case "TIME-PICKER":
                    renderTimePickerElement(el, htmlBuilder);
                    break;

                case "MEMO":
                    renderMemoElement(el, htmlBuilder);
                    break;

                case "DISASTER-SELECTOR":
                    renderDisasterSelectorElement(el, htmlBuilder);
                    break;

                case "EVV-EXCEPTION":
                    renderEvvExceptionElement(el, htmlBuilder);
                    break;

                case "SERVICE-SELECTOR":
                    renderServiceSelectorElement(el, htmlBuilder);
                    break;

                case "TEXT-FIELD":
                    renderTextFieldElement(el, htmlBuilder);
                    break;

                case "NUMERIC-FIELD":
                    renderNumericFieldElement(el, htmlBuilder);
                    break;

                case "VERIFIED-WITH":
                    renderVerifiedWithElement(el, htmlBuilder);
                    break;

                case "GENERAL-NOTE-CLIENT":
                    renderGeneralNoteClientElement(el, htmlBuilder);
                    break;

                case "GENERAL-NOTE-ATTENDANT":
                    renderGeneralNoteAttendantElement(el, htmlBuilder);
                    break;

                case "SUSPEND-REASON":
                    renderSuspendReasonElement(el, htmlBuilder);
                    break;

                case "IN-OUT-PICKER":
                    renderInOutPickerElement(el, htmlBuilder);
                    break;

                case "NUMERIC-SPINNER":
                    renderNumericSpinnerElement(el, htmlBuilder);
                    break;


                default:
                    htmlBuilder.push(el.outerHTML);
                    break;
            }
        }
        htmlBuilder.push('</div>');
    }

    function renderMemoElement(node, htmlBuilder) {

        let $element = $(`<textarea rows="4" cols="100" id="${node.id}" class="memo form-control code-editor-control" data-element="custom">${node.innerText}</textarea>`);

        copyAttributes(node, $element);

        htmlBuilder.push(`<span class="control-container">${$element[0].outerHTML}</span>`);
        htmlBuilder.recordElementType("memo");
    }

    function renderTextFieldElement(node, htmlBuilder) {

        let $element = $(`<input type="text" id="${node.id}" value="${node.innerText.trim()}" class="text-field form-control code-editor-control" data-element="custom">`);

        copyAttributes(node, $element);

        htmlBuilder.push(`<span class="control-container">${$element[0].outerHTML}</span>`);
        htmlBuilder.recordElementType("text-field");
    }

    function renderNumericFieldElement(node, htmlBuilder) {
        let $element = $(`<input type="number" id="${node.id}" value="${node.innerText.trim()}" class="numeric-field form-control code-editor-control" data-element="custom">`);

        copyAttributes(node, $element);

        htmlBuilder.push(`<span class="control-container">${$element[0].outerHTML}</span>`);
        htmlBuilder.recordElementType("text-field");
    }

    function renderNumericSpinnerElement(node, htmlBuilder) {

        let $element = $(`<input id="${node.id}" type="number" value="${node.innerText.trim()}" class="spinner numeric-spinner form-control code-editor-control" data-element="custom">`);

        copyAttributes(node, $element);

        htmlBuilder.push(`<span class="control-container">${$element[0].outerHTML}</span>`);
        htmlBuilder.recordElementType("numeric-spinner");
    }

    function renderInOutPickerElement(node, htmlBuilder) {
        let id = randomId();
        let value = node.innerText.trim().toLowerCase();

        let element =
            `<ul class="in-out-picker code-editor-control" data-element="custom">
               <li>
                 <input type="radio" value="in" name="in-out-${id}" id="in-${id}" class="k-radio" ${value === 'in' ? "checked" : ""}>
                 <label class="k-radio-label" for="in-${id}">IN</label>
               </li>
               <li>
                 <input type="radio" value="out" name="in-out-${id}" id="out-${id}" class="k-radio" ${value === 'out' ? "checked" : ""}>
                 <label class="k-radio-label" for="out-${id}">OUT</label>
               </li>
               <li>
                 <input type="radio" value="both" name="in-out-${id}" id="both-${id}" class="k-radio" ${value === 'in or out' ? "checked" : ""}>
                 <label class="k-radio-label" for="both-${id}">BOTH</label>
               </li>
            </ul>`;

        htmlBuilder.push(`<span class="control-container">${element}</span>`);
        htmlBuilder.recordElementType("in-out-picker");
    }

    function renderServiceSelectorElement(node, htmlBuilder) {
        let element = '<select class="service-selector code-editor-control form-control" placeholder="Select/Type a service..." data-element="custom"';
        if (node.id === "")
            element += ">";
        else
            element += ` id="${node.id}">`;

        element += "<option></option>";

        let lookups = getLookupValuesForElement("service-selector");

        for (let lookup of lookups) {
            let selected = "";
            if (node.innerText.trim() === lookup.value)
                selected = "selected";
            element += `<option ${selected}>${lookup.value}</option>`;
        }

        element += "</select>";
        htmlBuilder.push(`<span class="control-container">${element}</span>`);
        htmlBuilder.recordElementType("service-selector");
    }

    function renderSuspendReasonElement(node, htmlBuilder) {
        let element = '<select class="suspend-reason code-editor-control form-control" data-element="custom"';
        if (node.id === "")
            element += ">";
        else
            element += ` id="${node.id}">`;

        element += "<option value='' disabled selected hidden>Select reason...</option>";

        let lookups = getLookupValuesForElement("suspend-reason");

        for (let lookup of lookups) {
            let selected = "";
            if (node.innerText.trim() === lookup.value)
                selected = "selected";
            element += `<option ${selected}>${lookup.value}</option>`;
        }

        element += "</select>";
        htmlBuilder.push(`<span class="control-container">${element}</span>`);
        htmlBuilder.recordElementType("suspend-reason");
    }

    function renderVerifiedWithElement2(node, htmlBuilder) {
        let element = '<select class="verified-with code-editor-control form-control" data-element="custom"';
        if (node.id === "")
            element += ">";
        else
            element += ` id="${node.id}">`;

        element += "<option value='' disabled selected hidden>Select person...</option>";

        let lookups = getLookupValuesForElement("verified-with");

        for (let lookup of lookups) {
            let selected = "";
            if (node.innerText.trim() === lookup.value)
                selected = "selected";
            element += `<option ${selected}>${lookup.value}</option>`;
        }

        element += "</select>";
        htmlBuilder.push(`<span class="control-container">${element}</span>`);
        htmlBuilder.recordElementType("verified-with");
    }

    function renderVerifiedWithElement(node, htmlBuilder) {
        renderDropDownListElement("verified-with", 'Select person...', node, htmlBuilder);
    }

    function renderGeneralNoteClientElement(node, htmlBuilder) {
        renderDropDownListElement("general-note-client", 'Select Client action...', node, htmlBuilder);
    }

    function renderGeneralNoteAttendantElement(node, htmlBuilder) {
        renderDropDownListElement("general-note-attendant", 'Select Attendant action...', node, htmlBuilder);
    }

    function renderDropDownListElement(elementType, placeholderText, node, htmlBuilder) {
        let element = `<select class="${elementType} code-editor-control form-control" placeholder="Select a disaster..." data-element="custom"`;
        if (node.id === "")
            element += ">";
        else
            element += ` id="${node.id}">`;

        element += `<option value='' disabled selected hidden>${placeholderText}</option>`;

        let lookups = getLookupValuesForElement(`${elementType}`);

        for (let lookup of lookups) {
            let selected = "";
            if (node.innerText.trim() === lookup)
                selected = "selected";
            element += `<option ${selected}>${lookup.value}</option>`;
        }

        element += "</select>";
        htmlBuilder.push(`<span class="control-container">${element}</span>`);
        htmlBuilder.recordElementType(`${elementType}`);
    }

    function renderDisasterSelectorElement(node, htmlBuilder) {
        let element = '<select class="disaster-selector code-editor-control form-control" placeholder="Select a disaster..." data-element="custom"';
        if (node.id === "")
            element += ">";
        else
            element += ` id="${node.id}">`;

        element += "<option value='' disabled selected hidden>disaster...</option>";

        let lookups = getLookupValuesForElement("disaster-selector");

        for (let lookup of lookups) {
            let selected = "";
            if (node.innerText.trim() === lookup)
                selected = "selected";
            element += `<option ${selected}>${lookup.value}</option>`;
        }

        element += "</select>";
        htmlBuilder.push(`<span class="control-container">${element}</span>`);
        htmlBuilder.recordElementType("disaster-selector");
    }

    function renderEvvExceptionElement(node, htmlBuilder) {
        let element = '<select class="evv-exception code-editor-control form-control" data-element="custom"';
        if (node.id === "")
            element += ">";
        else
            element += ` id="${node.id}">`;

        element += "<option value='' disabled selected hidden>Select exception...</option>";

        let lookups = getLookupValuesForElement("evv-exception");

        for (let lookup of lookups) {
            let selected = "";
            if (node.innerText.trim() === lookup)
                selected = "selected";
            element += `<option ${selected}>${lookup.value}</option>`;
        }

        element += "</select>";
        htmlBuilder.push(`<span class="control-container">${element}</span>`);
        htmlBuilder.recordElementType("evv-exception");
    }

    function renderDatePickerElement(node, htmlBuilder) {
        //convert 2018-02-15T00:00:00-06:00 to 02/15/2018
        var date = node.innerText.trim();
        let $element = $(`<input type="date" id="${node.id}" data-value="${date}" class="date-picker code-editor-control" data-element="custom">`);
        copyAttributes(node, $element);
        htmlBuilder.push(`<span class="control-container">${$element[0].outerHTML}</span>`);
        htmlBuilder.recordElementType("date-picker");
    }

    function renderTimePickerElement(node, htmlBuilder) {
        //convert 00:05:00 to "[Today] 5:00 AM" (date portion not important, except to moment library)
        var time = node.innerText.trim();
        let $element = $(`<input type="time" id="${node.id}" data-value="${time}" class="time-picker code-editor-control" data-element="custom">`);
        copyAttributes(node, $element);
        htmlBuilder.push(`<span class="control-container">${$element[0].outerHTML}</span>`);
        htmlBuilder.recordElementType("time-picker");
    }
}

function addCodeRow(id) {
    //grab template html
    let template = $("#Code-row-" + id).html();

    //generate id suffix
    let data = { id: id };

    //render unique ids on elements in template
    let html = Mustache.render(template, data);

    let newRow = $(html);
    $(".code-table").append(newRow);


}


async function setupEmailLists(changeHandler) {

    //email branch list
    let $branchList = $("#email-to");
    let branches = await getEmailBranchList();

    for (let branch of branches) {
        $branchList.append(`<option value="${branch.code}">${branch.name}</option>`);
    }

    $branchList.on("change", changeHandler);

    //email multiselect list
    let $emailRecipients = $("#email-recipients");
    //$emailRecipients.attr("multiple", "multiple");

    $emailRecipients.kendoMultiSelect({
        dataValueField: "emailAddress",
        dataTextField: "emailAddress"
    });

}

async function setupAutoCompleteAttendants(id, onChange) {

    $(`#attendant-search-${id}`).kendoAutoComplete({
        dataSource: await getAttendantList(),
        change: onChange,
        filter: "contains",
        template: '<span class="autocomplete-list"><span class="autocomplete-list-strong">#= fullName #</span> | #= branch # | #= address # | Attendant ID: #= attendantID # </span>',
        placeholder: "Select attendant...",
        dataTextField: "searchField",
        autoWidth: true
    });

}

async function setupAutoCompleteClients(changeHandler) {

    let $clientSelector = $("#client-search")

    $clientSelector.kendoAutoComplete({
        dataSource: await getClientList(),
        change: changeHandler,
        filter: "contains",
        template: '<span class="autocomplete-list"><span class="autocomplete-list-strong">#= fullName #</span> | #= branch # | #= medicaidNumber # | #= city # | Client ID: #= evvClientId # </span>',
        placeholder: "Select client...",
        dataTextField: "searchField",
        //dataValueField: "fullName",
        autoWidth: true,
    });

    return $clientSelector;
}

//patch KendoAutoComplete widget to support dataValueField
//function patchKendoAutoComplete(autoCompObject) {
//    autoCompObject._select = function (li) {
//        var that = this,
//            separator = that.options.separator,
//            data = that._data(),
//            text,
//            idx;

//        li = $(li);

//        if (li[0] && !li.hasClass("k-state-selected")) {

//            idx = kendo.ui.List.inArray(li[0], that.ul[0]);

//            if (idx > -1) {
//                data = data[idx];
//                //if dataValueField provided, use _value
//                text = that.options.dataValueField ? that._value(data) : that._text(data);

//                if (separator) {
//                    text = replaceWordAtCaret(caretPosition(that.element[0]), that._accessor(), text, separator);
//                }

//                that._accessor(text);
//                that.current(li.addClass("k-state-selected"));
//            }
//        }

//        that._active = true;
//        that.listView.select.done = function (func) {
//            that._active = false;
//            func();
//        }
//        //return that.listView.select.done;
//        //         return that.listView.select(li).done(function () {
//        //             that._active = false;
//        //         });
//    }
//}


function openTokenNotesEditor(tokenNotesId) {

    var $input = $("#token-notes-" + tokenNotesId);
    const note = $input.val();

    var $tokenModal = $('#tokenModal');

    $("#token-note-text").val(note);

    let $modalSaveBtn = $("#token-modal-save-btn");

    $modalSaveBtn.on("click", function (e) {
        let newValue = $("#token-note-text").val();
        //let $input = $("#token-notes-" + tokenNotesId);
        $input.val(newValue);
        $input.trigger("change");
        $tokenModal.modal('hide');
    });

    //remove save button click events when token notes modal closes
    $tokenModal.on('hidden.bs.modal', () => $modalSaveBtn.off("click", null));

    //open the token editor
    $tokenModal.modal();
}


async function getAttendantList() {
    let attendants = cache.get("attendants");

    if (attendants) return Promise.resolve(attendants);

    attendants = await (await fetch("./CallTracker/GetAttendants")).json();

    cache.on("del:attendants", async () => {
        let data = await (await fetch("./CallTracker/GetAttendants")).json();
        cache.set("attendants", data, hoursToMilliseconds(8));
    });

    cache.set("attendants", attendants, hoursToMilliseconds(8))
    return Promise.resolve(attendants);
}

async function getClientList() {
    let clients = cache.get("clients");

    if (clients) return Promise.resolve(clients);

    clients = await (await fetch("./CallTracker/GetClients")).json();

    cache.on("del:clients", async () => {
        let data = await (await fetch("./CallTracker/GetClients")).json();
        cache.set("attendants", data, hoursToMilliseconds(8));
    });

    cache.set("clients", clients, hoursToMilliseconds(8));

    return Promise.resolve(clients);
}

async function getEmailBranchList() {
    let branches = cache.get("branches");

    //go ahead and preload the email list
    await getEmailRecipients();

    if (branches) return Promise.resolve(branches);

    branches = await (await fetch("./CallTracker/GetBranches")).json();

    cache.on("del:branches", async () => {
        let data = await (await fetch("./CallTracker/GetBranches")).json();
        cache.set("branches", data, hoursToMilliseconds(24));
    });

    cache.set("branches", branches, hoursToMilliseconds(24));

    return Promise.resolve(branches);
}

function minutesToMilliseconds(minutes) {
    return minutes * 60 * 1000;
}

function hoursToMilliseconds(hours) {
    return hours * 60 * 60 * 1000;
}

async function getEmailRecipients() {
    let emails = cache.get("emails");

    if (emails) return Promise.resolve(emails);

    emails = await (await fetch("./CallTracker/GetEmailRecipients")).json();

    cache.on("del:emails", async () => {
        let data = await (await fetch("./CallTracker/GetEmailRecipients")).json();
        cache.set("emails", data, minutesToMilliseconds(15));
    });

    cache.set("emails", emails, minutesToMilliseconds(15));

    return Promise.resolve(emails);
}

async function getReasonCodeList() {
    let codes = cache.get("codes");

    if (codes) return Promise.resolve(codes);

    codes = await (await fetch("./CallTracker/GetReasonCodes")).json();

    cache.on("del:codes", async () => {
        let data = await (await fetch("./CallTracker/GetReasonCodes")).json();
        cache.set("codes", data, hoursToMilliseconds(8));
    });

    cache.set("codes", codes, hoursToMilliseconds(8));

    return Promise.resolve(codes);
}
