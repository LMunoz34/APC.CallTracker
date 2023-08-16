using APC.CallTracker.Models;
using APC.CallTracker.Services;
using APC.Core.Data;
using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;

namespace APC.CallTracker.Services
{
    public class ClientService : ServiceBase
    {
        public ClientService(IDatabase database) : base(database) { }

        public List<Client> GetClients()
        {
            return Database.Select<Client>("tracker.spGetClients", CommandType.StoredProcedure);
        }
    }
}
