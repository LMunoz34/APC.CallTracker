using APC.Core.Data;
using Dapper;
using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;

namespace APC.CallTracker.Services
{
    public class VersioningService : ServiceBase
    {
        public VersioningService(IDatabase database) : base(database) { }

        public string GetCurrentVersion(string oldVersion = null, string userName = null)
        {
            var @params = new
            {
                userName,
                oldVersion,
            };

            return Database.GetDbConnection().ExecuteScalar<string>("tracker.spGetCurrentAppVersion", param: @params, commandType: CommandType.StoredProcedure);
        }
    }
}
