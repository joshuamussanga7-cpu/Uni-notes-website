/**
 * UNIVERSITY NOTES - AUTOMATED NOTIFICATION & SMART ROTATION ENGINE
 * Handles 4 daily sessions:
 * 1. Morning Motivation (08:00 AM)
 * 2. Midday / Afternoon Boost (12:00 PM)
 * 3. Evening Reflection & Personal Study Reminder (18:00 PM)
 * 4. Late-Night Good Wishes (22:00 PM)
 * in Africa/Dar_es_Salaam timezone, with Weekday vs Weekend/Spiritual rules
 * and 30-day anti-repetition smart rotation.
 */

class NotificationAutomationEngine {
    constructor(db, messaging) {
        this.db = db;
        this.messaging = messaging;
    }

    /**
     * Check if emergency stop is active
     */
    async isEmergencyStopped() {
        try {
            const doc = await this.db.collection("notificationSettings").doc("config").get();
            return doc.exists && doc.data().emergencyStop === true;
        } catch (e) {
            console.error("Error checking emergency stop:", e);
            return false;
        }
    }

    /**
     * Selects an eligible message using smart rotation & spiritual weekend rules
     */
    async selectEligibleMessage(category) {
        try {
            const now = new Date();
            const isWeekend = now.getDay() === 0 || now.getDay() === 6; // Sunday or Saturday

            // Fetch active messages for category
            let query = this.db.collection("motivationMessages")
                .where("category", "==", category)
                .where("status", "==", "active");

            const snapshot = await query.get();
            if (snapshot.empty) return null;

            let messages = [];
            snapshot.forEach(doc => {
                messages.push({ id: doc.id, ...doc.data() });
            });

            // If weekend, prioritize messages with spiritual or weekend tags
            if (isWeekend) {
                const spiritualMessages = messages.filter(m =>
                    (m.tags || []).some(t => ['spiritual', 'godFirst', 'faith', 'weekend', 'sunday', 'blessing'].includes(t))
                );
                if (spiritualMessages.length > 0) {
                    messages = spiritualMessages;
                }
            }

            // Fetch recent history to avoid repetition (last 30 days)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const historySnap = await this.db.collection("notificationJobs")
                .where("category", "==", category)
                .where("timestamp", ">=", firebase.firestore.Timestamp.fromDate(thirtyDaysAgo))
                .get();

            const recentlySentMessageIds = new Set();
            historySnap.forEach(doc => {
                if (doc.data().messageId) {
                    recentlySentMessageIds.add(doc.data().messageId);
                }
            });

            // Filter out recently sent messages if alternatives exist
            let eligible = messages.filter(m => !recentlySentMessageIds.has(m.id));
            if (eligible.length === 0) {
                eligible = messages; // Fallback if all messages were sent recently
            }

            // Sort favorites first, then random choice among eligible
            eligible.sort((a, b) => (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0));
            const randomIndex = Math.floor(Math.random() * Math.min(eligible.length, 5)); // Pick among top candidates
            return eligible[randomIndex] || messages[0];

        } catch (e) {
            console.error("Error selecting eligible message:", e);
            return null;
        }
    }

    /**
     * Executes scheduled notification session for a given category
     */
    async triggerSession(category) {
        if (await this.isEmergencyStopped()) {
            console.log(`[Automation] Session ${category} skipped: Emergency Stop is active.`);
            return;
        }

        const message = await this.selectEligibleMessage(category);
        if (!message) {
            console.log(`[Automation] No eligible messages found for category: ${category}`);
            return;
        }

        // Fetch all registered student device tokens
        const usersSnap = await this.db.collection("users").get();
        const tokens = [];
        usersSnap.forEach(doc => {
            const data = doc.data();
            if (data.fcmToken) {
                tokens.push(data.fcmToken);
            }
        });

        if (tokens.length === 0) {
            console.log(`[Automation] No FCM tokens found for session ${category}`);
            return;
        }

        // Record job dispatches
        const jobRef = await this.db.collection("notificationJobs").add({
            messageId: message.id,
            category,
            title: message.title,
            body: message.body,
            recipientCount: tokens.length,
            status: 'submitted',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        console.log(`[Automation] Dispatched ${category} notification "${message.title}" to ${tokens.length} devices.`);
        return jobRef.id;
    }
}
