import { useState, useEffect } from "react";
import { collection, query, orderBy, limit, getDocs, getCountFromServer, where } from "firebase/firestore";
import { db, auth } from "../lib/firebase.js";

export function useLeaderboard(currentXp) {
  const [topPlayers, setTopPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myRank, setMyRank] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchLeaderboard() {
      try {
        const usersRef = collection(db, "users");
        
        // Fetch top 50 players
        const q = query(usersRef, orderBy("xp_number", "desc"), limit(50));
        const snap = await getDocs(q);
        
        const players = snap.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            username: data["sargam-username"] || "Guest Player",
            xp: data["xp_number"] || 0,
            photoURL: data.photoURL || null
          };
        });

        if (isMounted) setTopPlayers(players);

        // Fetch my exact rank mathematically
        // Rank = (Number of people with strictly more XP than me) + 1
        if (currentXp !== undefined && currentXp > 0) {
          const rankQuery = query(usersRef, where("xp_number", ">", currentXp));
          const countSnap = await getCountFromServer(rankQuery);
          if (isMounted) setMyRank(countSnap.data().count + 1);
        } else {
          if (isMounted) setMyRank(null);
        }

      } catch (err) {
        console.error("Failed to fetch leaderboard", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchLeaderboard();

    return () => {
      isMounted = false;
    };
  }, [currentXp]);

  return { topPlayers, loading, myRank };
}
