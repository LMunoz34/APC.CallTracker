using APC.Core.Data;
using Microsoft.AspNetCore.Authentication;
using System;
using System.Collections.Generic;
using System.DirectoryServices.AccountManagement;
using System.Linq;
using System.Threading.Tasks;

namespace APC.CallTracker.Services
{
    public class ServiceBase
    {
        public IDatabase Database { get; private set; }
        public ServiceBase(IDatabase database)
        {
            Database = database;
        }
    }
}
