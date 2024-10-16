import { useState } from "react";
import { getWalletInfo } from "../../helperFunctions/sdkCallFunctions";
import { cogsToAgix, tokenName } from "../../helperFunctions/priceHelpers";
import "./styles.css";
import Loader from "../Loader/index.jsx";

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

    const walletInfoMeta = [
        { title: "address", value: address },
        { title: "balance", value: balance + " " + tokenName },
        { title: "transactions", value: transactionCount },
    ]

    return (
        <div className="wallet-info">
            <button onClick={getWalletInfoFromSDK}>Get wallet info</button>
            <Loader isLoading={isLoading} />
            {address && balance &&
            <table className="wallet-info-table">
                <tbody>
                    {walletInfoMeta.map(infoRow =>
                    <tr key={infoRow.title}>
                        <th scope="row">{infoRow.title}</th>
                        <td>{infoRow.value}</td>
                    </tr>)}
                </tbody>
            </table>}
        </div>
)}

export default WalletInfo;