using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace APC.CallTracker.Models
{
    public class Client
    {
        public string Branch { get; set; }
        public string MedicaidNumber { get; set; }
        public string ClientNumber { get; set; }
        public string FullName { get; set; }
        public int EvvClientId { get; set; }
        public string PhoneNumber { get; set; }
        public string Address { get; set; }
        public string City { get; set; }
        public string Zip { get; set; }
        public string SearchField => $"{FullName} {Branch} {EvvClientId} {MedicaidNumber} {City}";
    }
}
