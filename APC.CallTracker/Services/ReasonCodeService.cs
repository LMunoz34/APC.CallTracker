using APC.CallTracker.Models;
using APC.Core.Data;
using System;
using System.Collections.Generic;
using System.Data;
using System.Diagnostics;
using System.Linq;
using System.Threading.Tasks;

namespace APC.CallTracker.Services
{
    public class ReasonCodeService : ServiceBase
    {
        public ReasonCodeService(IDatabase database) : base(database) { }

        public List<ReasonCode> GetReasonCodeTemplates(bool billingOnly, bool showNew = false)
        {
            var sql = "tracker.spGetReasonCodeTemplates";

            if (Debugger.IsAttached || showNew)
            {
                sql = "tracker.spGetReasonCodeTemplates_Test";
                //billingOnly = true;
            }

            var @params = new { billingOnly };

            return Database.Select<ReasonCode>(sql, param: @params, commandType: CommandType.StoredProcedure);
        }
    }
}
