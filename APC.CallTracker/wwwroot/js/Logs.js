(function (userName) {

    loadGrid();

    async function loadGrid() {
        $("#grid").kendoGrid({
            dataSource: {
                data: await getCallRecords(userName),
                schema: {
                    model: {
                        fields: {
                            ID: { type: "number" },
                            CallDate: { type: "date" },
                            UserName: { type: "string" },
                            CallDirection: { type: "string" },
                            FirstName: { type: "string" },
                            LastName: { type: "string" },
                            Extension: { type: "string" },
                            OtherParty: { type: "string" },
                            DurationSeconds: { type: "number" },
                            TalkTimeSeconds: { type: "number" },
                            CallResult: { type: "string" },
                            CallStart: { type: "time" },
                            Answered: { type: "time" },
                            CallEnd: { type: "time" },
                            Action_Type: { type: "string" },
                            HasAudioRecording: { type: "boolean" },
                            FileName: { type: "string" },
                            UniqueId: { type: "string" }
                        }
                    }
                }
            },
            height: 550,
            filterable: true,
            sortable: true,
            columns: [
                {
                    field: "ID",
                    title: "Call ID",
                    filterable: false,
                    hidden: true
                },
                {
                    field: "CallDirection",
                    title: "Call Type"
                },
                {
                    field: "OtherParty",
                    title: "Other Party",
                    format: "{0:999-999-9999}"
                },
                {
                    field: "Answered",
                    title: "Started",
                    format: "{0:T}"
                },
                {
                    field: "CallEnd",
                    title: "Ended",
                    format: "{0:T}"
                },
                {
                    field: "TalkTimeSeconds",
                    title: "Time Secs"
                },
                {
                    field: "HasAudioRecording",
                    title: "Has Audio"
                }
            ]
        });
    }

    async function getCallRecords(userName) {
        //let url = `./Logs/GetCallRecords?userNames=${userName}`;
        let url = `./Logs/GetCallRecords`;
        return await (await fetch(url)).json();
    }

}(userName));