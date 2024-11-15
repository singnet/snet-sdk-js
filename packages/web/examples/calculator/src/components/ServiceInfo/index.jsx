import { cogsToAgix, tokenName } from "../../helperFunctions/priceHelpers";
import Loader from "../Loader/index.jsx";
import "./styles.css";

const ServiceInfo = ({serviceClient}) => {
    if (!serviceClient) {
        return <div className="loader"><Loader isLoading={true} /></div>
    }
    const metadata = serviceClient.metadata;
    const group = serviceClient.group;

    const generatePriceInfoMeta = (priceInfo) => {
        return [
            { title: "free calls", value: group.free_calls},
            { title: "pricing model", value: priceInfo.price_model },
            { title: "is default", value: String(priceInfo.default) },
            { title: "price", value: cogsToAgix(priceInfo.price_in_cogs) + " " + tokenName }
        ]
    }

    return (
        <div className="service-info-container">
            <div className="main-service-info">
                {metadata.media.map(image =>
                    <div key={image.url} className="service-image-container">
                        <img src={image.url} alt={image.altText} />
                    </div>
                )}
                <h2>{metadata.display_name}</h2>
            </div>
            <div className="groups-container">
                <div className="service-image-container">
                    <h3>{group.group_name}:</h3>
                    {group.pricing.map(price =>{
                        const priceInfoMeta = generatePriceInfoMeta(price);
                        return (
                            <table className="pricing-info-table" key={price.price_model}>
                                <tbody>
                                    {priceInfoMeta.map(priceRow => 
                                        <tr key={priceRow.title}>
                                            <th scope="row">{priceRow.title}</th>
                                            <td>{priceRow.value}</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

export default ServiceInfo;