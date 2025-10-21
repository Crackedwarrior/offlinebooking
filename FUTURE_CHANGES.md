# Future Changes - Dynamic Show Times Implementation

**Document Version:** 1.0  
**Created:** October 21, 2025  
**Author:** AI Assistant  
**Status:** 📋 Planned for Future Implementation

---

## **Overview**

This document outlines the approach for implementing fully dynamic show times in the Offline Booking System. The current system uses hardcoded show times due to database schema constraints, but this document provides a roadmap for making show times completely user-configurable.

---

## **Current Limitation**

### **Database Schema Constraint:**
```prisma
enum Show {
  MORNING
  MATINEE
  EVENING
  NIGHT
}
```

The database schema defines a hardcoded `Show` enum with exactly 4 values, which limits the system to only these predefined show times.

### **Impact:**
- Users cannot create custom show times (e.g., "AFTERNOON", "LATE NIGHT", "SPECIAL SHOW")
- Database will reject any show names not in the enum
- Frontend can allow dynamic input, but backend will fail

---

## **Proposed Solution: Dynamic Show Times**

### **Phase 1: Database Schema Changes**

#### **1.1 Update Prisma Schema:**
```prisma
// Remove hardcoded enum
// enum Show {
//   MORNING
//   MATINEE
//   EVENING
//   NIGHT
// }

// Update models to use String instead of Show enum
model Booking {
  id            String        @id @default(uuid())
  date          DateTime
  show          String        // Changed from Show enum to String
  screen        String
  movie         String
  movieLanguage String        @default("HINDI")
  // ... rest of fields
}

model BmsBooking {
  id        String   @id @default(uuid())
  seatId    String
  date      DateTime
  show      String   // Changed from Show enum to String
  classLabel String
  status    SeatStatus @default(BMS_BOOKED)
  // ... rest of fields
}
```

#### **1.2 Create Show Times Management Table:**
```prisma
model ShowTime {
  id        String   @id @default(uuid())
  key       String   @unique // e.g., "MORNING", "AFTERNOON", "LATE_NIGHT"
  label     String   // e.g., "Morning Show", "Afternoon Show"
  startTime String   // e.g., "10:00 AM"
  endTime   String   // e.g., "12:00 PM"
  enabled   Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([key])
  @@index([enabled])
}
```

### **Phase 2: Backend API Updates**

#### **2.1 Show Times Management Endpoints:**
```typescript
// GET /api/show-times - Get all show times
app.get('/api/show-times', async (req, res) => {
  const showTimes = await prisma.showTime.findMany({
    where: { enabled: true },
    orderBy: { startTime: 'asc' }
  });
  res.json({ success: true, data: showTimes });
});

// POST /api/show-times - Create new show time
app.post('/api/show-times', async (req, res) => {
  const { key, label, startTime, endTime } = req.body;
  const showTime = await prisma.showTime.create({
    data: { key, label, startTime, endTime }
  });
  res.json({ success: true, data: showTime });
});

// PUT /api/show-times/:id - Update show time
app.put('/api/show-times/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const showTime = await prisma.showTime.update({
    where: { id },
    data: updates
  });
  res.json({ success: true, data: showTime });
});

// DELETE /api/show-times/:id - Delete show time
app.delete('/api/show-times/:id', async (req, res) => {
  const { id } = req.params;
  await prisma.showTime.delete({ where: { id } });
  res.json({ success: true, message: 'Show time deleted' });
});
```

#### **2.2 Update Existing Endpoints:**
- Update all booking endpoints to handle string show values
- Update seat status endpoints to work with dynamic show names
- Update reporting endpoints to group by show names

### **Phase 3: Frontend Updates**

#### **3.1 Settings Store Enhancement:**
```typescript
interface SettingsState {
  // ... existing fields
  showTimes: ShowTimeSettings[];
  
  // New methods
  addShowTime: (showTime: ShowTimeSettings) => void;
  updateShowTime: (id: string, updates: Partial<ShowTimeSettings>) => void;
  deleteShowTime: (id: string) => void;
  loadShowTimesFromBackend: () => Promise<void>;
  saveShowTimesToBackend: () => Promise<void>;
}
```

#### **3.2 Settings Component Updates:**
- Add "Add Show Time" button (already implemented)
- Add show time management UI
- Add validation for show time conflicts
- Add drag-and-drop reordering

#### **3.3 Show Selector Updates:**
- Make show selector dynamic based on backend data
- Update show cards to use dynamic show times
- Update booking flow to work with dynamic shows

### **Phase 4: Migration Strategy**

#### **4.1 Data Migration:**
```sql
-- Create ShowTime records from existing enum values
INSERT INTO ShowTime (id, key, label, startTime, endTime, enabled) VALUES
('uuid1', 'MORNING', 'Morning Show', '10:00 AM', '12:00 PM', true),
('uuid2', 'MATINEE', 'Matinee Show', '2:00 PM', '5:00 PM', true),
('uuid3', 'EVENING', 'Evening Show', '6:00 PM', '9:00 PM', true),
('uuid4', 'NIGHT', 'Night Show', '9:30 PM', '12:30 AM', true);

-- Update existing bookings to use string values
UPDATE Booking SET show = 'MORNING' WHERE show = 'MORNING';
UPDATE Booking SET show = 'MATINEE' WHERE show = 'MATINEE';
UPDATE Booking SET show = 'EVENING' WHERE show = 'EVENING';
UPDATE Booking SET show = 'NIGHT' WHERE show = 'NIGHT';
```

#### **4.2 Backward Compatibility:**
- Keep enum values as default show times
- Provide migration script for existing data
- Maintain API compatibility during transition

---

## **Implementation Steps**

### **Step 1: Database Migration**
1. Create new `ShowTime` table
2. Populate with default show times
3. Update `Booking` and `BmsBooking` models
4. Run migration script

### **Step 2: Backend Updates**
1. Update Prisma schema
2. Create show times management endpoints
3. Update existing endpoints to handle string shows
4. Test all API endpoints

### **Step 3: Frontend Updates**
1. Update settings store with dynamic show times
2. Enhance settings component UI
3. Update show selectors throughout the app
4. Test booking flow with dynamic shows

### **Step 4: Testing & Deployment**
1. Test with existing data
2. Test with new dynamic show times
3. Deploy to staging environment
4. Deploy to production

---

## **Benefits of Dynamic Show Times**

### **User Experience:**
- ✅ Users can create custom show times
- ✅ Flexible show scheduling
- ✅ Better theater management
- ✅ No more hardcoded limitations

### **Technical Benefits:**
- ✅ Fully backend-driven configuration
- ✅ Database-driven show management
- ✅ Scalable show time system
- ✅ Better data consistency

### **Business Benefits:**
- ✅ Adapt to different theater schedules
- ✅ Support special events/shows
- ✅ Better operational flexibility
- ✅ Future-proof architecture

---

## **Risks & Considerations**

### **Technical Risks:**
- Database migration complexity
- Breaking changes to existing API
- Data consistency during migration
- Performance impact of dynamic queries

### **Mitigation Strategies:**
- Thorough testing in staging environment
- Gradual rollout with feature flags
- Backup existing data before migration
- Monitor performance after deployment

---

## **Alternative Approaches**

### **Option 1: Hybrid Approach**
- Keep enum for backward compatibility
- Add `customShowName` field for dynamic shows
- More complex but maintains compatibility

### **Option 2: Configuration-Based**
- Store show times in configuration table
- Use enum for core shows, config for custom
- Gradual migration approach

### **Option 3: Plugin Architecture**
- Make show times pluggable
- Allow theaters to define their own show structures
- Most flexible but most complex

---

## **Conclusion**

The dynamic show times implementation would provide significant benefits in terms of flexibility and user experience. However, it requires careful planning and execution due to the database schema changes involved.

**Recommended Approach:** Implement this as a major version upgrade (v2.0) with proper migration tools and backward compatibility considerations.

**Timeline Estimate:** 2-3 weeks for full implementation including testing and deployment.

---

**Document Status:** 📋 Ready for Implementation  
**Priority:** Medium (Nice to have, not critical)  
**Dependencies:** Database migration tools, thorough testing environment
