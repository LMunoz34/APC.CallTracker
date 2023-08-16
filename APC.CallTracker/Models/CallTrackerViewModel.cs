using APC.CallTracker.Services;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace APC.CallTracker.Models
{
    public class CallTrackerViewModel
    {
        public CallTrackerService CallTrackerService { get; private set; }

        public CallTrackerViewModel(CallTrackerService callTrackerService)
        {
            CallTrackerService = callTrackerService;
        }

        public string UserName { get; set; }
        public string UserSignature { get; set; }
        public string UserDisplayName { get; set; }

        public int ID { get; set; }
        public string CallType { get; set; }
        public string PhoneNumber { get; set; }
        public int? Client_Vesta_clntnumber { get; set; }
        public string Client_Vesta_Branch { get; set; }
        public string ClientName { get; set; }
        public List<AttendantLog> Attendants { get; set; } = new List<AttendantLog>();
    }
}
