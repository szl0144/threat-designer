import React, { useEffect, useState } from 'react';
import ChatComponent from '../../components/Chat/ChatComponent';
import { getThreatModelingAllResults } from '../../services/ThreatDesigner/stats';

export default function Chat() {
  const [threatModels, setThreatModels] = useState([]);

  useEffect(() => {
    const fetchThreatModels = async () => {
      try {
        const results = await getThreatModelingAllResults();
        const models = results?.data?.catalogs.map(catalog => ({
          id: catalog.job_id,
          title: catalog.title
        })) || [];
        setThreatModels(models);
      } catch (error) {
        console.error('Error fetching threat models:', error);
        setThreatModels([]);
      }
    };

    fetchThreatModels();
  }, []);

  return <ChatComponent threatModels={threatModels} />;
} 