import { useState } from "react";
import { getWalletInfo } from "../../helperFunctions/sdkCallFunctions";
import { cogsToAgix, tokenName } from "../../helperFunctions/priceHelpers";
import "./styles.css";
import Loader from "../Loader";

const WalletInfo = () => {
    const [address, setAddress] = useState('');
    const [balance, setBalance] = useState('');
    const [transactionCount, setTransactionCount] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const getWalletInfoFromSDK = async () => {
        setIsLoading(true);
        const {address, balance, transactionCount} = await getWalletInfo();
        setAddress(address);
        setBalance(cogsToAgix(balance))
        setTransactionCount(transactionCount);
        setIsLoading(false);
      }

    return (
        <div className="wallet-info">
            <button onClick={getWalletInfoFromSDK}>Connect metamask</button>
            <Loader isLoading={isLoading} />
            {address && balance &&
            <table className="wallet-info-table">
                <tbody>
                    <tr>
                        <th scope="row">address</th>
                        <td>{address}</td>
                    </tr>
                    <tr>
                        <th scope="row">balance</th>
                        <td>{balance}{tokenName}</td>
                    </tr>
                    <tr>
                        <th scope="row">transactions</th>
                        <td>{transactionCount}</td>
                    </tr>
                </tbody>
            </table>}
        </div>
)}

export default WalletInfo;