using APC.CallTracker.Services;
using APC.CallTracker.Models;
using APC.Core.Data;
using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;

namespace APC.CallTracker.Services
{
    public class AttendantService : ServiceBase
    {
        public AttendantService(IDatabase database) : base(database) { }

        public List<Attendant> GetAttendants()
        {
            return Database.Select<Attendant>("tracker.spGetAttendants", CommandType.StoredProcedure);
        }
    }
}
