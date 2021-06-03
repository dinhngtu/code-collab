import PortalBinding from "./PortalBinding";

export interface IConnectionManagerListener {
    onConnectionAdded(connection : PortalBinding) : void;
}