using APC.CallTracker.Services;
using APC.Core.Data;
using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;

namespace APC.CallTracker.Services
{
    public class DashboardService : ServiceBase
    {
        public DashboardService(IDatabase database) : base(database) { }


        public List<UserLinesResult> ReportNumberOfLinesCleared(DateTime? startDate, DateTime? endDate)
        {
            var @params = new
            {
                startDate,
                endDate
            };

            var results = Database.Select<UserLinesResult>("tracker.spReportNumberOfLinesCleared", param: @params, commandType: CommandType.StoredProcedure);

            return results;
        }

        public class UserLinesResult
        {
            public string UserName { get; set; }
            public int TotalLinesCleared { get; set; }
        }

        public dynamic GetEmployeePerformanceSummaries(DateTime? startDate, DateTime? endDate)
        {
            var @params = new
            {
                startDate,
                endDate
            };

            return Database.Select<dynamic>("tracker.spReportEmployeePerformanceByDate", param: @params, commandType: CommandType.StoredProcedure);
        }
    }
}
