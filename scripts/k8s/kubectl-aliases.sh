# Kubectl Aliases and Helper Functions
# Add to ~/.bashrc or ~/.zshrc or create a separate file to source

# Basic aliases
alias k='kubectl'
alias kgp='kubectl get pods'
alias kgs='kubectl get services'
alias kgd='kubectl get deployments'
alias kgi='kubectl get ingress'
alias kgn='kubectl get nodes'
alias kgns='kubectl get namespaces'

# Logs
alias kl='kubectl logs'
alias klf='kubectl logs -f'
alias klp='kubectl logs -p'  # Previous container logs

# Describe
alias kdes='kubectl describe'
alias kdesp='kubectl describe pod'
alias kdess='kubectl describe service'
alias kdesd='kubectl describe deployment'

# Delete
alias kdel='kubectl delete'
alias kdelp='kubectl delete pod'
alias kdels='kubectl delete service'
alias kdeld='kubectl delete deployment'

# Exec
alias kex='kubectl exec -it'
alias keti='kubectl exec -it'

# Apply/Create
alias ka='kubectl apply -f'
alias kc='kubectl create'

# Get with wide output
alias kgpw='kubectl get pods -o wide'
alias kgsw='kubectl get services -o wide'
alias kgdw='kubectl get deployments -o wide'

# Get all resources
alias kga='kubectl get all'
alias kgaa='kubectl get all --all-namespaces'

# Context and config
alias kctx='kubectl config current-context'
alias kcon='kubectl config get-contexts'
alias kuse='kubectl config use-context'

# Namespace
alias kns='kubectl config set-context --current --namespace'
alias kgns='kubectl get namespaces'

# Top (resource usage)
alias ktop='kubectl top'
alias ktopn='kubectl top nodes'
alias ktopp='kubectl top pods'

# Rollout
alias kroll='kubectl rollout'
alias krollr='kubectl rollout restart'
alias krolls='kubectl rollout status'
alias krollh='kubectl rollout history'

# Port forward
alias kpf='kubectl port-forward'

# Helper Functions

# Get pod logs by label
function klogs() {
    kubectl logs -l app=$1 --all-containers=true
}

# Get pod logs and follow by label
function klogsf() {
    kubectl logs -l app=$1 --all-containers=true -f
}

# Execute command in pod by label
function kexec() {
    POD=$(kubectl get pod -l app=$1 -o jsonpath='{.items[0].metadata.name}')
    kubectl exec -it $POD -- ${2:-sh}
}

# Get pod name by label
function kpod() {
    kubectl get pod -l app=$1 -o jsonpath='{.items[0].metadata.name}'
}

# Restart deployment
function krestart() {
    kubectl rollout restart deployment/$1
}

# Scale deployment
function kscale() {
    kubectl scale deployment/$1 --replicas=$2
}

# Get all resources in namespace
function kgetall() {
    kubectl get all -n ${1:-default}
}

# Watch pods
function kwatchp() {
    watch -n 2 kubectl get pods ${1:+-n $1}
}

# Get pod YAML
function kpodyaml() {
    kubectl get pod $1 -o yaml
}

# Get service endpoints
function kendpoints() {
    kubectl get endpoints ${1:+-n $1}
}

# Decode secret
function ksecret() {
    kubectl get secret $1 -o jsonpath='{.data}' | jq -r 'to_entries[] | "\(.key): \(.value | @base64d)"'
}

# Get events sorted by time
function kevents() {
    kubectl get events --sort-by='.lastTimestamp' ${1:+-n $1}
}

# Quick debug pod
function kdebug() {
    kubectl run debug-pod --rm -i --tty --image=busybox -- sh
}

# Get resource usage for namespace
function kusage() {
    echo "Pods:"
    kubectl top pods -n ${1:-default}
    echo ""
    echo "Nodes:"
    kubectl top nodes
}

# Tail logs from all pods matching label
function ktail() {
    kubectl logs -f -l app=$1 --all-containers=true --max-log-requests=10
}

# Get pod by partial name
function kgetpod() {
    kubectl get pods | grep $1
}

# Delete all pods in namespace
function kdelallpods() {
    kubectl delete pods --all -n ${1:-default}
}

# Get ingress URL
function kingress() {
    kubectl get ingress -n ${1:-default} -o jsonpath='{.items[0].spec.rules[0].host}'
}

echo "Kubectl aliases and functions loaded!"
echo "Type 'alias | grep kubectl' to see all aliases"
