import "./styles.css";

const Loader = ({isLoading}) => {
    if (!isLoading) {
        return null;
    }
    return (
        <div className="loader-container">
            <div className="lds-dual-ring"></div>
        </div>
    )
}

export default Loader;