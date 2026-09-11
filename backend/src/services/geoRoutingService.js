/**
 * services/geoRoutingService.js
 * -----------------------------
 * Centralized Geographic Master Data & Haversine Inspector Routing Engine
 * for Legal Metrology Packaged Commodities Enforcement.
 */

// ── Geographic Master Data Hierarchy ─────────────────────────────────────────
const GEO_MASTER = [
  {
    state: "Assam",
    zoneId: "GAU_METRO",
    zoneName: "Guwahati Metropolitan Zone",
    district: "Kamrup Metropolitan",
    hq: "Guwahati",
    hqCoords: { lat: 26.184, lng: 91.745 },
    pincodes: [
      { pincode: "781001", locality: "Fancy Bazaar / Panbazaar", hubType: "Wholesale & Trading Market", lat: 26.184, lng: 91.745 },
      { pincode: "781003", locality: "Chandmari / Silpukhuri", hubType: "Retail Consumer Market", lat: 26.192, lng: 91.776 },
      { pincode: "781005", locality: "Christian Basti / G.S. Road", hubType: "Supermarkets & Commercial Malls", lat: 26.155, lng: 91.778 },
      { pincode: "781022", locality: "Six Mile / Dispur", hubType: "Capital & Convenience Hub", lat: 26.136, lng: 91.802 },
      { pincode: "781024", locality: "Zoo Road / Geetanagar", hubType: "Retail Marts & Department Stores", lat: 26.168, lng: 91.789 },
      { pincode: "781028", locality: "Beltola / Basistha", hubType: "Central Wholesale Grain & FMCG Depot", lat: 26.118, lng: 91.792 },
    ],
  },
  {
    state: "Assam",
    zoneId: "UPPER_ASSAM",
    zoneName: "Upper Assam Zone",
    district: "Dibrugarh & Tinsukia",
    hq: "Dibrugarh",
    hqCoords: { lat: 27.472, lng: 94.912 },
    pincodes: [
      { pincode: "786001", locality: "Dibrugarh Central", hubType: "Commercial Commodity Market", lat: 27.472, lng: 94.912 },
      { pincode: "786125", locality: "Tinsukia Industrial Area", hubType: "FMCG Distribution Hub", lat: 27.502, lng: 95.362 },
      { pincode: "785001", locality: "Jorhat Commercial Centre", hubType: "Agro-Commodity Exchange", lat: 26.750, lng: 94.220 },
    ],
  },
  {
    state: "Assam",
    zoneId: "CENTRAL_ASSAM",
    zoneName: "Central Assam Zone",
    district: "Nagaon & Sonitpur",
    hq: "Tezpur",
    hqCoords: { lat: 26.633, lng: 92.792 },
    pincodes: [
      { pincode: "782001", locality: "Nagaon Town Market", hubType: "Consumer Retail Hub", lat: 26.345, lng: 92.684 },
      { pincode: "784001", locality: "Tezpur Bazaar", hubType: "District Supply Centre", lat: 26.633, lng: 92.792 },
    ],
  },
  {
    state: "Assam",
    zoneId: "LOWER_ASSAM",
    zoneName: "Lower Assam Zone",
    district: "Bongaigaon & Dhubri",
    hq: "Bongaigaon",
    hqCoords: { lat: 26.502, lng: 90.553 },
    pincodes: [
      { pincode: "783380", locality: "Bongaigaon City", hubType: "Industrial Border Market", lat: 26.502, lng: 90.553 },
      { pincode: "783301", locality: "Dhubri Riverport Market", hubType: "Border Trade Depot", lat: 26.020, lng: 89.980 },
    ],
  },
  {
    state: "Assam",
    zoneId: "BARAK_VALLEY",
    zoneName: "Barak Valley Zone",
    district: "Cachar & Karimganj",
    hq: "Silchar",
    hqCoords: { lat: 24.833, lng: 92.779 },
    pincodes: [
      { pincode: "788001", locality: "Silchar Central / Tarapur", hubType: "District Supply & Retail Hub", lat: 24.833, lng: 92.779 },
      { pincode: "788005", locality: "Silchar Sadar / Rongpur", hubType: "Commercial Trading Center", lat: 24.825, lng: 92.795 },
      { pincode: "788710", locality: "Karimganj Town Market", hubType: "Border Commerce Market", lat: 24.868, lng: 92.358 },
    ],
  },
];

// ── Inspector Registry Master Data ──────────────────────────────────────────
const INSPECTORS_MASTER = [
  {
    id: "LM-042",
    code: "INS-042",
    name: "Inspector Boruah",
    fullName: "Pranab Boruah",
    email: "p.boruah.lm@assam.gov.in",
    phone: "+91 94350 12042",
    role: "Senior Legal Metrology Inspector",
    division: "Guwahati Metropolitan Zone",
    jurisdiction: ["781001", "781003", "781005", "781022", "781024", "781028"],
    status: "ACTIVE",
    badgeNumber: "LM-AS-GAU-042",
    joinedDate: "2019-04-15",
    stationCoords: { lat: 26.184, lng: 91.745 },
  },
  {
    id: "LM-028",
    code: "INS-028",
    name: "Inspector S. Sharma",
    fullName: "Siddharth Sharma",
    email: "s.sharma.lm@assam.gov.in",
    phone: "+91 94350 44028",
    role: "Legal Metrology Inspector (Grade-I)",
    division: "Central Assam Zone",
    jurisdiction: ["782001", "784001"],
    status: "ACTIVE",
    badgeNumber: "LM-AS-CA-028",
    joinedDate: "2021-08-01",
    stationCoords: { lat: 26.633, lng: 92.792 },
  },
  {
    id: "LM-015",
    code: "INS-015",
    name: "Inspector P. Kalita",
    fullName: "Partha Kalita",
    email: "p.kalita.lm@assam.gov.in",
    phone: "+91 94350 88015",
    role: "Field Enforcement Officer",
    division: "Upper Assam Zone",
    jurisdiction: ["786001", "786125", "785001"],
    status: "ACTIVE",
    badgeNumber: "LM-AS-UA-015",
    joinedDate: "2020-02-10",
    stationCoords: { lat: 27.472, lng: 94.912 },
  },
  {
    id: "LM-051",
    code: "INS-051",
    name: "Inspector M. Rahman",
    fullName: "Mujibur Rahman",
    email: "m.rahman.lm@assam.gov.in",
    phone: "+91 94350 33051",
    role: "Assistant Legal Metrology Inspector",
    division: "Lower Assam Zone",
    jurisdiction: ["783380", "783301"],
    status: "ACTIVE",
    badgeNumber: "LM-AS-LA-051",
    joinedDate: "2022-11-15",
    stationCoords: { lat: 26.502, lng: 90.553 },
  },
  {
    id: "LM-063",
    code: "INS-063",
    name: "Inspector D. Das",
    fullName: "Dipankar Das",
    email: "d.das.lm@assam.gov.in",
    phone: "+91 94350 66063",
    role: "Legal Metrology Inspector",
    division: "Barak Valley Zone",
    jurisdiction: ["788001", "788005", "788710"],
    status: "ACTIVE",
    badgeNumber: "LM-AS-BV-063",
    joinedDate: "2023-01-20",
    stationCoords: { lat: 24.833, lng: 92.779 },
  },
];

// ── Haversine Distance Calculation ──────────────────────────────────────────
/**
 * Calculates geographic distance in kilometers between two coordinates using Haversine formula.
 */
function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  if (
    lat1 === null || lat1 === undefined ||
    lon1 === null || lon1 === undefined ||
    lat2 === null || lat2 === undefined ||
    lon2 === null || lon2 === undefined
  ) {
    return Infinity;
  }

  const R = 6371; // Radius of the Earth in km
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

// ── Normalize Location Administrative Data ──────────────────────────────────
/**
 * Normalizes state, district, locality, and pincode matching against GEO_MASTER.
 */
function normalizeLocation({ latitude, longitude, pincode, state, district, locality, location }) {
  const normPin = String(pincode || "").trim();
  const normState = String(state || "").trim();
  const normDistrict = String(district || "").trim();
  const normLocality = String(locality || "").trim();
  const fullText = `${location || ""} ${normLocality} ${normDistrict} ${normState}`.toLowerCase();

  // 1. Direct Pincode match in GEO_MASTER
  if (normPin) {
    for (const zone of GEO_MASTER) {
      const pinObj = zone.pincodes.find((p) => p.pincode === normPin);
      if (pinObj) {
        return {
          state: zone.state,
          district: zone.district.split("&")[0].trim(),
          locality: normLocality || pinObj.locality.split("/")[0].trim(),
          pincode: normPin,
          zoneId: zone.zoneId,
          zoneName: zone.zoneName,
          latitude: latitude != null ? Number(latitude) : pinObj.lat,
          longitude: longitude != null ? Number(longitude) : pinObj.lng,
          normalized: true,
        };
      }
    }
  }

  // 2. Text / Locality search across zones
  for (const zone of GEO_MASTER) {
    const zoneDistricts = zone.district.toLowerCase();
    const zoneHq = zone.hq.toLowerCase();

    const matchesDistrict = normDistrict && zoneDistricts.includes(normDistrict.toLowerCase());
    const matchesHq = fullText.includes(zoneHq);

    for (const pinObj of zone.pincodes) {
      const locName = pinObj.locality.toLowerCase();
      if (fullText.includes(locName) || (normLocality && locName.includes(normLocality.toLowerCase()))) {
        return {
          state: zone.state,
          district: zone.district.split("&")[0].trim(),
          locality: normLocality || pinObj.locality.split("/")[0].trim(),
          pincode: pinObj.pincode,
          zoneId: zone.zoneId,
          zoneName: zone.zoneName,
          latitude: latitude != null ? Number(latitude) : pinObj.lat,
          longitude: longitude != null ? Number(longitude) : pinObj.lng,
          normalized: true,
        };
      }
    }

    if (matchesDistrict || matchesHq) {
      const defaultPin = zone.pincodes[0];
      return {
        state: zone.state,
        district: zone.district.split("&")[0].trim(),
        locality: normLocality || zone.hq,
        pincode: normPin || defaultPin.pincode,
        zoneId: zone.zoneId,
        zoneName: zone.zoneName,
        latitude: latitude != null ? Number(latitude) : defaultPin.lat,
        longitude: longitude != null ? Number(longitude) : defaultPin.lng,
        normalized: true,
      };
    }
  }

  // 3. Coordinate proximity within Assam bounding box
  if (latitude != null && longitude != null) {
    let closestPin = null;
    let closestDist = Infinity;
    let matchingZone = null;

    for (const zone of GEO_MASTER) {
      for (const pinObj of zone.pincodes) {
        const d = haversineDistanceKm(latitude, longitude, pinObj.lat, pinObj.lng);
        if (d < closestDist) {
          closestDist = d;
          closestPin = pinObj;
          matchingZone = zone;
        }
      }
    }

    // Only match if within 60km of a known Assam circle hub
    if (closestPin && closestDist <= 60) {
      return {
        state: matchingZone.state,
        district: matchingZone.district.split("&")[0].trim(),
        locality: normLocality || closestPin.locality.split("/")[0].trim(),
        pincode: normPin || closestPin.pincode,
        zoneId: matchingZone.zoneId,
        zoneName: matchingZone.zoneName,
        latitude: Number(latitude),
        longitude: Number(longitude),
        distanceToHubKm: closestDist,
        normalized: true,
      };
    }
  }

  return {
    state: normState || "Unverified",
    district: normDistrict || "Unverified",
    locality: normLocality || "Unverified",
    pincode: normPin || "",
    zoneId: null,
    zoneName: null,
    latitude: latitude != null ? Number(latitude) : null,
    longitude: longitude != null ? Number(longitude) : null,
    normalized: false,
  };
}

// ── Nearest Eligible Inspector Routing Engine ───────────────────────────────
/**
 * Finds the nearest authorized, active inspector for a complaint location.
 * Respects geographic jurisdiction boundaries strictly before evaluating distance.
 */
function findNearestEligibleInspector(locationInput) {
  const norm = normalizeLocation(locationInput);

  // Jurisdiction check: Must belong to recognized Authority jurisdiction (Assam)
  if (norm.state && norm.state.toLowerCase() !== "assam" && norm.state.toLowerCase() !== "unverified") {
    return {
      inspectorId: null,
      inspectorName: null,
      assignmentStatus: "Inspector Assignment Pending",
      normalizedLocation: norm,
      distanceKm: null,
      reason: `Location is outside Assam State Legal Metrology jurisdiction (${norm.state}). Awaiting supervisory allocation.`,
    };
  }

  if (!norm.zoneId) {
    return {
      inspectorId: null,
      inspectorName: null,
      assignmentStatus: "Inspector Assignment Pending",
      normalizedLocation: norm,
      distanceKm: null,
      reason: "Location could not be matched to an active enforcement circle. Awaiting manual assignment.",
    };
  }

  // Find active inspectors authorized for this zone / jurisdiction
  const activeInspectors = INSPECTORS_MASTER.filter((i) => i.status === "ACTIVE");

  // Filter inspectors authorized for this zone or specific pincode
  const eligibleInspectors = activeInspectors.filter((ins) => {
    const coversPincode = norm.pincode && ins.jurisdiction.includes(norm.pincode);
    const coversDivision = ins.division.toLowerCase() === norm.zoneName.toLowerCase();
    return coversPincode || coversDivision;
  });

  if (eligibleInspectors.length === 0) {
    return {
      inspectorId: null,
      inspectorName: null,
      assignmentStatus: "Inspector Assignment Pending",
      normalizedLocation: norm,
      distanceKm: null,
      reason: `No active inspector authorized for ${norm.zoneName}. Awaiting supervisory allocation.`,
    };
  }

  // If coordinates are present, calculate Haversine distance to each eligible inspector's station
  if (norm.latitude != null && norm.longitude != null) {
    const inspectorsWithDistance = eligibleInspectors.map((ins) => {
      const dist = haversineDistanceKm(
        norm.latitude,
        norm.longitude,
        ins.stationCoords?.lat,
        ins.stationCoords?.lng
      );
      return { inspector: ins, distanceKm: dist };
    });

    inspectorsWithDistance.sort((a, b) => a.distanceKm - b.distanceKm);

    const nearest = inspectorsWithDistance[0];
    return {
      inspectorId: nearest.inspector.id,
      inspectorName: nearest.inspector.fullName || nearest.inspector.name,
      assignmentStatus: "ASSIGNED",
      normalizedLocation: norm,
      distanceKm: nearest.distanceKm,
      reason: `Assigned to nearest authorized officer in ${norm.zoneName} (Station Distance: ${nearest.distanceKm} km).`,
    };
  }

  // Coordinates absent: assign by administrative jurisdiction match
  const selected = eligibleInspectors[0];
  return {
    inspectorId: selected.id,
    inspectorName: selected.fullName || selected.name,
    assignmentStatus: "ASSIGNED",
    normalizedLocation: norm,
    distanceKm: null,
    reason: `Assigned by administrative jurisdiction match (${norm.zoneName} & Pincode ${norm.pincode || 'Circle Pool'}).`,
  };
}

module.exports = {
  GEO_MASTER,
  INSPECTORS_MASTER,
  haversineDistanceKm,
  normalizeLocation,
  findNearestEligibleInspector,
};
