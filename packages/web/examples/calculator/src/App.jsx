import React, { useEffect, useState } from "react";
import "./App.css"
import { getServiceClient } from "./helperFunctions/sdkCallFunctions";
import ServiceDemo from "./components/ServiceDemo";
import ServiceInfo from "./components/ServiceInfo";
import WalletInfo from "./components/WalletInfo";

const ExampleService = () => {
  const [serviceClient, setServiceClient] = useState();

  useEffect(() => {
    const getServiceData = async () => {
      const serviceClient = await getServiceClient();
      setServiceClient(serviceClient);
    }

    getServiceData()
  }, [])

    return (
      <div className="service-container">
        <div className="service-info">
          <ServiceInfo serviceClient={serviceClient} />
          <WalletInfo />
        </div>
        <ServiceDemo serviceClient={serviceClient}/>
      </div>
    );
}

export default ExampleService;
