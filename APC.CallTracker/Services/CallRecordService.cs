using APC.CallTracker.Config;
using APC.Core.Data;
using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;

namespace APC.CallTracker.Services
{
    public class CallRecordService : ServiceBase
    {
        private GeneralConfiguration GeneralConfiguration { get; set; }

        public CallRecordService(IDatabase database, GeneralConfiguration generalConfiguration) : base(database)
        {
            GeneralConfiguration = generalConfiguration;
        }

        public List<dynamic> GetCallRecords(DateTime? startDate, DateTime? endDate, string userNames, bool includeBinary = false)
        {
            var @params = new
            {
                startDate,
                endDate,
                userNames,
                includeBinary
            };

            var records = Database.Select<dynamic>("tracker.spGetCDR", param: @params, commandType: CommandType.StoredProcedure);
            return records;
        }

    }
}
